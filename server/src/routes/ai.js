/**
 * AI 故事工坊（D 线，全部需 ADMIN_TOKEN）：
 *   POST /api/admin/ai/generate   DeepSeek 生成故事脚本（含标题/钩子/标签/正文）
 *   POST /api/admin/ai/stories    保存为草稿或直接上架（自动建城市点位）
 *   POST /api/admin/ai/tts        edge-tts 合成配音 → stories.audio_url
 *   GET  /api/admin/ai/list       最近生成的故事列表
 *
 * 每次生成/配音在 ai_tasks 表留痕（done/failed），便于追溯与重试。
 * 外部调用复用 geo.js 的 fetch + AbortSignal.timeout 容错范式。
 */
const express = require("express");
const path = require("path");
const fs = require("fs");
const pool = require("../db");
const config = require("../config");
const { adminRequired } = require("../middleware/auth");
const { MsEdgeTTS, OUTPUT_FORMAT } = require("msedge-tts");
const { makeCover } = require("../lib/cover");
const { voiceForTags, sanitizeVoice } = require("../lib/voice");
const {
  MODE_KEYS, DEFAULT_MODE, isValidMode, voiceForMode, ttsOptionsForMode,
} = require("../lib/modes");
const {
  callDeepseek, transferModes, STORY_SYSTEM_PROMPT, normalizeStory,
} = require("../lib/ai-generate");

const router = express.Router();
router.use(adminRequired);

// 类别名 → topics 表 id（App 卡片徽章与搜索依赖 story_topics 关联）
const TOPIC_IDS = { 传说: 1, 历史: 2, 人文: 3, 地质: 4 };

// 城市 → 经纬度：新故事自动建点位，App 地图 pin 落在真实城市
const CITY_COORDS = {
  北京: [39.9042, 116.4074], 上海: [31.2304, 121.4737],
  杭州: [30.2741, 120.1551], 苏州: [31.2989, 120.5853],
  成都: [30.5728, 104.0668], 西安: [34.3416, 108.9398],
  南京: [32.0603, 118.7969], 厦门: [24.4798, 118.0894],
};

/** ai_tasks 留痕 */
async function logTask(type, input, result, status) {
  await pool.query(
    "INSERT INTO ai_tasks (story_id, type, input_material, status, result) VALUES (NULL, ?, ?, ?, ?)",
    [type, JSON.stringify(input || {}), status, result ? JSON.stringify(result) : null]
  );
}

// POST /api/admin/ai/generate —— 两阶段生成（防事实漂移）：
//   第一阶段：聊天模式提示词 → 元数据 + chat 脚本
//   第二阶段：chat 脚本 → 其余 3 个模式并行风格转换（失败不阻塞整体返回）
router.post("/generate", async (req, res) => {
  const { topic, city, material } = req.body || {};
  if (typeof topic !== "string" || !topic.trim()) {
    return res.status(400).json({ error: "请填写故事主题（景点/地点名称）" });
  }
  if (!config.ai.apiKey) {
    return res.status(503).json({ error: "AI 服务未配置，请先在 server/.env 设置 DEEPSEEK_API_KEY" });
  }
  const userPrompt =
    `主题/景点：${topic.trim()}\n城市：${city || "待定"}\n` +
    `参考素材：${material && material.trim() ? material.trim().slice(0, 2000) : "无"}`;

  let story;
  try {
    const parsed = await callDeepseek([
      { role: "system", content: STORY_SYSTEM_PROMPT },
      { role: "user", content: userPrompt },
    ]);
    story = normalizeStory(parsed, topic);
    if (!story) throw new Error("生成的正文过短或缺少标题");
  } catch (e) {
    await logTask("rewrite", { topic, city, material }, null, "failed");
    return res.status(502).json({ error: "AI 生成失败：" + e.message });
  }

  const targetModes = MODE_KEYS.filter((k) => k !== DEFAULT_MODE);
  const results = await transferModes(story.script, targetModes);
  const variants = [{ mode: DEFAULT_MODE, script: story.script, error: null }, ...results];
  await logTask("rewrite", { topic, city, material }, { story, variants }, "done");
  res.json({ story, variants });
});

// POST /api/admin/ai/stories —— 故事 + 讲述模式变体一个事务写入
router.post("/stories", async (req, res) => {
  const { story, publish, variants } = req.body || {};
  const s = normalizeStory(story, story && story.title);
  if (!s) return res.status(400).json({ error: "故事数据不完整（需标题与至少 100 字正文）" });

  // 变体白名单校验：只接受合法模式 key 且正文 ≥100 字；chat 模式以主脚本为准，不接受覆盖
  const variantScripts = new Map();
  for (const v of Array.isArray(variants) ? variants : []) {
    if (!v || !isValidMode(v.mode) || v.mode === DEFAULT_MODE) continue;
    const script = String(v.script || "").trim();
    if (script.length < 100) continue;
    variantScripts.set(v.mode, script);
  }

  const conn = await pool.getConnection();
  let storyId = 0;
  let slug = s.slug;
  try {
    await conn.beginTransaction();

    // slug 查重：重名追加 -2、-3…
    const [existRows] = await conn.query("SELECT id FROM stories WHERE slug = ?", [slug]);
    if (existRows.length) {
      let n = 2;
      for (;;) {
        const cand = `${slug}-${n}`;
        const [rows] = await conn.query("SELECT id FROM stories WHERE slug = ?", [cand]);
        if (!rows.length) { slug = cand; break; }
        n += 1;
      }
    }

    const status = publish ? 2 : 0;
    const [r] = await conn.query(
      `INSERT INTO stories
         (slug, title, hook, emotion_tags, script, duration_sec, source_note, city, status, play_count, published_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ${publish ? "NOW()" : "NULL"})`,
      [slug, s.title, s.hook, JSON.stringify(s.emotionTags), s.script, s.durationSec, s.sourceNote, s.city, status]
    );
    storyId = Number(r.insertId);

    // 讲述模式变体：chat = 主脚本，其余来自请求
    let variantCount = 0;
    for (const mode of MODE_KEYS) {
      const script = mode === DEFAULT_MODE ? s.script : variantScripts.get(mode);
      if (!script) continue;
      await conn.query(
        `INSERT INTO story_variants (story_id, mode, script, voice, duration_sec)
         VALUES (?, ?, ?, ?, ?)`,
        [storyId, mode, script, voiceForMode(mode), s.durationSec]
      );
      variantCount += 1;
    }

    // 类型标签落库：category → story_topics（App 卡片徽章/搜索依赖该关联，缺失会导致前端报错）
    const topicId = TOPIC_IDS[s.category] || TOPIC_IDS["人文"];
    await conn.query("INSERT INTO story_topics (story_id, topic_id) VALUES (?, ?)", [
      storyId,
      topicId,
    ]);

    await conn.commit();
    res.json({ storyId, slug, status, variantCount });
  } catch (e) {
    await conn.rollback();
    res.status(500).json({ error: "保存失败：" + e.message });
    return;
  } finally {
    conn.release();
  }

  // 事务外的事后处理（失败不阻断已保存的故事）：
  // 自动生成封面（本地 SVG 插画风）
  try {
    const coverUrl = makeCover({
      id: storyId, slug, title: s.title, city: s.city, category: s.category, hook: s.hook,
    });
    await pool.query("UPDATE stories SET cover_url = ? WHERE id = ?", [coverUrl, storyId]);
  } catch (e) {
    console.warn("封面生成失败（不影响上架）:", e.message);
  }

  // 城市能对上坐标 → 自动建点位（App 地图 pin 与距离正常显示）
  const coords = CITY_COORDS[s.city];
  if (coords) {
    try {
      const [pr] = await pool.query(
        "INSERT INTO points (name, city, lat, lng, radius_m, address) VALUES (?, ?, ?, ?, 200, '')",
        [s.title.slice(0, 64), s.city, coords[0], coords[1]]
      );
      await pool.query("INSERT INTO story_points (story_id, point_id, sort) VALUES (?, ?, 0)", [
        storyId,
        Number(pr.insertId),
      ]);
    } catch (e) {
      console.warn("点位创建失败（不影响上架）:", e.message);
    }
  }
});

// POST /api/admin/ai/variants —— 为单篇补生成缺失变体（源脚本：chat 变体 > story 变体 > 主脚本）
router.post("/variants", async (req, res) => {
  const storyId = Number((req.body || {}).storyId);
  if (!Number.isInteger(storyId) || storyId <= 0) {
    return res.status(400).json({ error: "storyId 不正确" });
  }
  const [rows] = await pool.query("SELECT id, script FROM stories WHERE id = ?", [storyId]);
  if (!rows.length) return res.status(404).json({ error: "故事不存在" });
  const [vRows] = await pool.query("SELECT mode, script FROM story_variants WHERE story_id = ?", [storyId]);
  const have = new Set(vRows.map((r) => r.mode));
  const missing = MODE_KEYS.filter((k) => !have.has(k));
  if (!missing.length) {
    return res.json({ ok: true, variants: [], message: "该故事变体已齐全" });
  }

  const src =
    (vRows.find((r) => r.mode === DEFAULT_MODE) || vRows.find((r) => r.mode === "story") || rows[0]).script;
  const results = await transferModes(src, missing);
  for (const r of results) {
    if (!r.script) continue;
    await pool.query(
      `INSERT IGNORE INTO story_variants (story_id, mode, script, voice, duration_sec)
       VALUES (?, ?, ?, ?, ?)`,
      [storyId, r.mode, r.script, voiceForMode(r.mode), Math.max(60, Math.round(r.script.length / 4.5))]
    );
  }
  await logTask("rewrite", { storyId, missing }, results, "done");
  res.json({ ok: true, variants: results });
});

// POST /api/admin/ai/variant-tts —— { storyId, mode } 按模式合成配音（音色/语速由 modes.js 定）
router.post("/variant-tts", async (req, res) => {
  const storyId = Number((req.body || {}).storyId);
  const mode = String((req.body || {}).mode || "");
  if (!Number.isInteger(storyId) || storyId <= 0) {
    return res.status(400).json({ error: "storyId 不正确" });
  }
  if (!isValidMode(mode)) {
    return res.status(400).json({ error: "讲述模式不正确" });
  }
  const [[variant]] = await pool.query(
    "SELECT id, script FROM story_variants WHERE story_id = ? AND mode = ?",
    [storyId, mode]
  );
  if (!variant) return res.status(404).json({ error: "该模式的变体不存在，请先生成" });

  const voice = voiceForMode(mode);
  const audioRoot = path.join(__dirname, "..", "..", "audio");
  // toFile 在给定目录内写固定文件名 audio.mp3，故按 故事+模式+时间戳 建独立子目录避免互相覆盖
  const outDir = path.join(audioRoot, `ai-${storyId}-${mode}-${Date.now().toString(36)}`);
  fs.mkdirSync(outDir, { recursive: true });
  try {
    const tts = new MsEdgeTTS();
    await tts.setMetadata(voice, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);
    const { audioFilePath } = await tts.toFile(outDir, variant.script, ttsOptionsForMode(mode));
    if (!audioFilePath) throw new Error("未生成音频文件");
    const url = "/audio/" + path.relative(audioRoot, audioFilePath).replace(/\\/g, "/");
    await pool.query("UPDATE story_variants SET audio_url = ?, voice = ? WHERE id = ?", [
      url, voice, variant.id,
    ]);
    await logTask("tts", { storyId, mode, voice }, { audioUrl: url }, "done");
    res.json({ ok: true, audioUrl: url, voice });
  } catch (e) {
    await logTask("tts", { storyId, mode, voice }, null, "failed");
    res.status(502).json({ error: "语音合成失败：" + e.message });
  }
});

// POST /api/admin/ai/cover —— 为故事（重新）生成封面（新故事保存时已自动生成；此接口用于补历史故事）
router.post("/cover", async (req, res) => {
  const storyId = Number((req.body || {}).storyId);
  if (!Number.isInteger(storyId) || storyId <= 0) {
    return res.status(400).json({ error: "storyId 不正确" });
  }
  const [rows] = await pool.query(
    `SELECT s.id, s.slug, s.title, s.hook, s.city,
            (SELECT t.name FROM story_topics st
               JOIN topics t ON t.id = st.topic_id
              WHERE st.story_id = s.id ORDER BY st.topic_id LIMIT 1) AS category
       FROM stories s WHERE s.id = ?`,
    [storyId]
  );
  if (!rows.length) return res.status(404).json({ error: "故事不存在" });
  const story = rows[0];
  try {
    const coverUrl = makeCover({
      id: story.id, slug: story.slug, title: story.title,
      city: story.city, category: story.category || "人文", hook: story.hook,
    });
    await pool.query("UPDATE stories SET cover_url = ? WHERE id = ?", [coverUrl, story.id]);
    res.json({ ok: true, coverUrl });
  } catch (e) {
    res.status(502).json({ error: "封面生成失败：" + e.message });
  }
});

// POST /api/admin/ai/tts —— { storyId, voice? }；未指定音色时按故事心情标签自动匹配（lib/voice.js）
router.post("/tts", async (req, res) => {
  const storyId = Number((req.body || {}).storyId);
  if (!Number.isInteger(storyId) || storyId <= 0) {
    return res.status(400).json({ error: "storyId 不正确" });
  }
  const [[story]] = await pool.query("SELECT id, script, emotion_tags AS emotionTags FROM stories WHERE id = ?", [storyId]);
  if (!story) return res.status(404).json({ error: "故事不存在" });
  if (!story.script || !story.script.trim()) {
    return res.status(400).json({ error: "故事没有正文，无法配音" });
  }
  let tags = story.emotionTags;
  if (typeof tags === "string") { try { tags = JSON.parse(tags); } catch (_) { tags = []; } }
  const voice = sanitizeVoice((req.body || {}).voice || voiceForTags(tags));

  const audioRoot = path.join(__dirname, "..", "..", "audio");
  // toFile 在给定目录内写固定文件名 audio.mp3，故每个故事用独立子目录避免互相覆盖
  const outDir = path.join(audioRoot, `ai-${storyId}-${Date.now().toString(36)}`);
  fs.mkdirSync(outDir, { recursive: true });
  try {
    const tts = new MsEdgeTTS();
    await tts.setMetadata(voice, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);
    const { audioFilePath } = await tts.toFile(outDir, story.script);
    if (!audioFilePath) throw new Error("未生成音频文件");
    const url = "/audio/" + path.relative(audioRoot, audioFilePath).replace(/\\/g, "/");
    await pool.query("UPDATE stories SET audio_url = ? WHERE id = ?", [url, storyId]);
    await logTask("tts", { storyId, voice }, { audioUrl: url }, "done");
    res.json({ ok: true, audioUrl: url, voice });
  } catch (e) {
    await logTask("tts", { storyId, voice }, null, "failed");
    res.status(502).json({ error: "语音合成失败：" + e.message });
  }
});

// POST /api/admin/ai/tts-sample —— { voice } 合成一句试听音频（按音色缓存，秒回）
router.post("/tts-sample", async (req, res) => {
  const voice = sanitizeVoice((req.body || {}).voice);
  const samplesDir = path.join(__dirname, "..", "..", "audio", "samples");
  const sampleFile = path.join(samplesDir, voice + ".mp3");
  try {
    if (!fs.existsSync(sampleFile)) {
      fs.mkdirSync(samplesDir, { recursive: true });
      const tts = new MsEdgeTTS();
      await tts.setMetadata(voice, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);
      await tts.toFile(samplesDir, "你好，我是流光幻旅的故事讲述人，用声音陪你走过这座城市的每一段时光。");
      // toFile 写固定名 audio.mp3 → 重命名为音色名
      fs.renameSync(path.join(samplesDir, "audio.mp3"), sampleFile);
    }
    res.json({ ok: true, sampleUrl: "/audio/samples/" + voice + ".mp3" });
  } catch (e) {
    res.status(502).json({ error: "试听合成失败：" + e.message });
  }
});

// GET /api/admin/ai/list —— 含变体计数（徽章与快捷按钮依据）
router.get("/list", async (req, res) => {
  const [rows] = await pool.query(
    `SELECT s.id, s.slug, s.title, s.city, s.status, s.audio_url AS audioUrl,
            s.cover_url AS coverUrl, s.created_at AS createdAt,
            (SELECT COUNT(*) FROM story_variants v WHERE v.story_id = s.id) AS variantCount,
            (SELECT COUNT(*) FROM story_variants v WHERE v.story_id = s.id AND v.audio_url IS NOT NULL) AS variantAudioCount
       FROM stories s
      WHERE s.source_note LIKE 'AI 生成%'
      ORDER BY s.id DESC
      LIMIT 20`
  );
  res.json({ stories: rows });
});

module.exports = router;
