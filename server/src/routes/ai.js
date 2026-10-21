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
  callDeepseek, transferModes, STORY_SYSTEM_PROMPT, storyUserPrompt, normalizeStory,
} = require("../lib/ai-generate");
const { saveStory } = require("../lib/story-save");
const { bochaWebSearch } = require("../lib/websearch");
const { factCheckStory } = require("../lib/fact-check");
const { amapCityAttractions } = require("../lib/amap");

const router = express.Router();
router.use(adminRequired);

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

  try {
    const { storyId, slug, variantCount } = await saveStory(s, { publish: !!publish, variantScripts });
    res.json({ storyId, slug, status: publish ? 2 : 0, variantCount });
  } catch (e) {
    res.status(500).json({ error: "保存失败：" + e.message });
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

/* ================================================================
   批量故事生产线（自动上架 · 真实准确优先）
   设计文档：docs/superpowers/specs/2026-10-21-batch-story-pipeline-design.md
   ================================================================ */

const batchJobs = new Map(); // jobId → { topics, done, failed, total, results, startedAt }
const BATCH_TTL = 30 * 60 * 1000;
const BATCH_CONCURRENCY = 2;
const BATCH_MAX = 20;

function sweepBatchJobs() {
  const now = Date.now();
  for (const [id, j] of batchJobs) if (now - j.startedAt > BATCH_TTL) batchJobs.delete(id);
}

/** 按需生成留痕统计：用户搜过/拍过的景点频次 Top N */
async function onDemandTopics(limit) {
  const [rows] = await pool.query(
    "SELECT input_material FROM ai_tasks WHERE type='on-demand' AND status='done' ORDER BY id DESC LIMIT 500"
  );
  const count = new Map();
  for (const r of rows) {
    let m = r.input_material;
    if (typeof m === "string") {
      try { m = JSON.parse(m); } catch (_) { m = null; }
    }
    const spot = m && m.spot;
    const name = spot && String(spot.name || "").trim();
    if (!name) continue;
    const key = `${spot.city || ""}|${name}`;
    const prev = count.get(key);
    count.set(key, { name, city: String(spot.city || ""), n: (prev ? prev.n : 0) + 1 });
  }
  return [...count.values()]
    .sort((a, b) => b.n - a.n)
    .slice(0, limit)
    .map(({ name, city, n }) => ({ name, city, n }));
}

/** 排除库内已有（同名同城，含草稿） */
async function filterExisting(topics) {
  let existing = new Set();
  try {
    const [rows] = await pool.query("SELECT title, city FROM stories");
    for (const r of rows) existing.add(`${r.city || ""}|${String(r.title || "").trim()}`);
  } catch (_) {
    /* 查不到就不过滤，宁可多给候选 */
  }
  const seen = new Set();
  const out = [];
  for (const t of topics) {
    const key = `${t.city || ""}|${t.name}`;
    if (existing.has(key) || seen.has(key)) continue;
    seen.add(key);
    out.push(t);
  }
  return out;
}

/** 单篇批量生产：素材 → 约束写稿 → 核查 → 变体 → 落库上架 → 配音 */
async function generateOne(topic) {
  try {
    // ① 搜素材：真实准确优先——搜不到宁可不生成
    const searched = await bochaWebSearch(`${topic.name} ${topic.city}`.trim());
    const material = searched ? searched.material : "";
    if (!material) {
      await logTask("batch", topic, { error: "未搜到可靠素材，按真实准确优先原则跳过" }, "failed");
      return { name: topic.name, ok: false, error: "未搜到可靠素材（BOCHA_API_KEY 未配置或搜索结果为空）" };
    }
    // ② 信源约束写稿 ③ AI 事实核查 pass
    const parsed = await callDeepseek([
      { role: "system", content: STORY_SYSTEM_PROMPT },
      { role: "user", content: storyUserPrompt(topic) },
    ]);
    const story = normalizeStory(parsed, topic.name);
    if (!story) throw new Error("生成的正文过短或缺少标题");
    const checked = await factCheckStory(material, story.script);
    story.script = checked.script;
    story.durationSec = Math.max(60, Math.round(checked.script.length / 4.5));
    // ④ 风格转换 3 变体 ⑤ 落库上架（封面/点位由 saveStory 自动处理）
    const results = await transferModes(checked.script, MODE_KEYS.filter((k) => k !== DEFAULT_MODE));
    const variantScripts = new Map();
    for (const r of results) if (r.script) variantScripts.set(r.mode, r.script);
    const { storyId, slug } = await saveStory(story, { publish: true, variantScripts });
    // ⑥ 4 模式配音（失败不阻断：App 端浏览器语音合成兜底）
    await synthBatchAudio(storyId, checked.script, variantScripts);
    await logTask("batch", topic, { storyId, slug, factIssues: checked.issues }, "done");
    return { name: topic.name, ok: true, storyId, slug };
  } catch (e) {
    await logTask("batch", topic, { error: (e && e.message) || "生成失败" }, "failed").catch(() => {});
    return { name: topic.name, ok: false, error: (e && e.message) || "生成失败" };
  }
}

/** 批量配音：4 模式逐一合成（chat 用主脚本，其余用变体），单模式失败不阻塞 */
async function synthBatchAudio(storyId, chatScript, variantScripts) {
  const audioRoot = path.join(__dirname, "..", "..", "audio");
  for (const mode of MODE_KEYS) {
    const script = mode === DEFAULT_MODE ? chatScript : variantScripts.get(mode);
    if (!script) continue;
    const voice = voiceForMode(mode);
    const outDir = path.join(audioRoot, `ai-${storyId}-${mode}-${Date.now().toString(36)}`);
    try {
      fs.mkdirSync(outDir, { recursive: true });
      const tts = new MsEdgeTTS();
      await tts.setMetadata(voice, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);
      const { audioFilePath } = await Promise.race([
        tts.toFile(outDir, script, ttsOptionsForMode(mode)),
        new Promise((_, rej) => setTimeout(() => rej(new Error("配音超时")), 60000)),
      ]);
      if (!audioFilePath) throw new Error("未生成音频文件");
      const url = "/audio/" + path.relative(audioRoot, audioFilePath).replace(/\\/g, "/");
      await pool.query("UPDATE story_variants SET audio_url = ?, voice = ? WHERE story_id = ? AND mode = ?", [
        url, voice, storyId, mode,
      ]);
    } catch (e) {
      console.warn(`批量配音失败（故事 ${storyId} 模式 ${mode}，浏览器语音兜底）:`, e.message);
    }
  }
}

/** 批量任务执行：并发 2 的简单队列 */
function runBatch(jobId, job) {
  const queue = [...job.topics];
  const worker = async () => {
    while (queue.length) {
      const topic = queue.shift();
      const result = await generateOne(topic);
      job.results.push(result);
      if (result.ok) job.done += 1;
      else job.failed += 1;
    }
  };
  Promise.all(Array.from({ length: BATCH_CONCURRENCY }, () => worker().catch(() => {})));
}

// POST /api/admin/ai/batch-plan —— 选题清单（高德按城市 / 按需搜索留痕）
router.post("/batch-plan", async (req, res) => {
  const { source, city, limit } = req.body || {};
  const lim = Math.min(50, Math.max(1, Number(limit) || 20));
  let topics = [];
  if (source === "amap-city") {
    if (typeof city !== "string" || !city.trim()) {
      return res.status(400).json({ error: "请填写城市名" });
    }
    const names = await amapCityAttractions(city.trim());
    topics = names.map((n) => ({ name: n, city: city.trim() }));
    if (!topics.length) {
      return res.json({ topics: [], hint: "未拉取到景点清单（AMap key 未配置或未开通 Web 服务）" });
    }
  } else if (source === "on-demand") {
    topics = await onDemandTopics(lim);
    if (!topics.length) {
      return res.json({ topics: [], hint: "暂无按需生成留痕数据（用户搜过/拍过的景点会出现在这里）" });
    }
  } else {
    return res.status(400).json({ error: "source 须为 amap-city 或 on-demand" });
  }
  const filtered = await filterExisting(topics);
  res.json({ topics: filtered.slice(0, lim), hint: `候选 ${filtered.length} 个（已排除库内已有）` });
});

// POST /api/admin/ai/batch-generate —— 提交批量任务（自动上架）
router.post("/batch-generate", async (req, res) => {
  const { topics } = req.body || {};
  if (!Array.isArray(topics) || !topics.length) {
    return res.status(400).json({ error: "请选择至少一个景点" });
  }
  if (topics.length > BATCH_MAX) {
    return res.status(400).json({ error: `每批最多 ${BATCH_MAX} 个景点` });
  }
  if (!config.ai.apiKey) {
    return res.status(503).json({ error: "AI 服务未配置，请先在 server/.env 设置 DEEPSEEK_API_KEY" });
  }
  const clean = topics
    .map((t) => ({
      name: String((t && t.name) || "").trim().slice(0, 60),
      city: String((t && t.city) || "").trim().slice(0, 20),
    }))
    .filter((t) => t.name);
  if (!clean.length) return res.status(400).json({ error: "景点名称不能为空" });

  sweepBatchJobs();
  const jobId = "b" + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  batchJobs.set(jobId, {
    topics: clean, done: 0, failed: 0, total: clean.length, results: [], startedAt: Date.now(),
  });
  runBatch(jobId, batchJobs.get(jobId));
  res.json({ jobId, total: clean.length });
});

// GET /api/admin/ai/batch/:jobId —— 进度轮询
router.get("/batch/:jobId", (req, res) => {
  const job = batchJobs.get(String(req.params.jobId || ""));
  if (!job) return res.status(404).json({ error: "批量任务不存在或已过期" });
  res.json({ done: job.done, failed: job.failed, total: job.total, results: job.results });
});

// POST /api/admin/ai/:id/unpublish —— 一键下架（status → 草稿，App 立即不可见）
router.post("/:id/unpublish", async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ error: "故事 ID 不正确" });
  }
  const [r] = await pool.query(
    "UPDATE stories SET status = 0, published_at = NULL WHERE id = ? AND status = 2",
    [id]
  );
  if (!r.affectedRows) {
    return res.status(404).json({ error: "故事不存在或未上架" });
  }
  res.json({ ok: true });
});

module.exports = router;
