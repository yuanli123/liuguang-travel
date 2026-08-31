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

const router = express.Router();
router.use(adminRequired);

const CITIES = ["北京", "上海", "杭州", "苏州", "成都", "西安", "南京", "厦门"];
const STYLES = ["治愈", "悬疑", "史诗", "纪实"];
const CATEGORIES = ["历史", "传说", "地质", "人文"];
const TAG_POOL = ["治愈", "震撼", "怀旧", "神秘", "温暖", "悲壮"];

// 城市 → 经纬度：新故事自动建点位，App 地图 pin 落在真实城市
const CITY_COORDS = {
  北京: [39.9042, 116.4074], 上海: [31.2304, 121.4737],
  杭州: [30.2741, 120.1551], 苏州: [31.2989, 120.5853],
  成都: [30.5728, 104.0668], 西安: [34.3416, 108.9398],
  南京: [32.0603, 118.7969], 厦门: [24.4798, 118.0894],
};

const SYSTEM_PROMPT = `你是一位资深的旅行故事编剧，擅长把景点写成适合边走边听的沉浸式故事音频脚本。
根据用户提供的主题/景点与素材，创作一篇故事。要求：
1. 标题：不超过 20 字，有画面感
2. 钩子 hook：不超过 40 字，制造悬念或反差，让人想继续听
3. 正文 script：350-550 字，口语化短句，有具体场景细节，包含一个冲突、悬念或反转，结尾有余味；段落用换行分隔
4. emotionTags：1-2 个，从 [治愈, 震撼, 怀旧, 神秘, 温暖, 悲壮] 中选
5. category：从 [历史, 传说, 地质, 人文] 中选一个
6. city：故事所在城市名（如 北京）
7. slug：英文短标识（小写字母数字连字符，如 west-lake-legend）
8. sourceNote：一句话信源性质说明（如「基于公开景区资料与民间传说创作」）
9. 不编造具体数据，涉及史实用模糊表述
只输出一个 JSON 对象，不要任何其他文字：
{"slug":"...","title":"...","hook":"...","emotionTags":["..."],"category":"...","city":"...","script":"...","sourceNote":"..."}`;

/** 归一化并校验故事对象（AI 返回与前端提交共用同一口径） */
function normalizeStory(s, fallbackTopic) {
  if (!s || typeof s !== "object") return null;
  const script = String(s.script || "").trim();
  const title = String(s.title || "").trim() || String(fallbackTopic || "").trim().slice(0, 20);
  if (!title || script.length < 100) return null;
  let slug = String(s.slug || "")
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 50);
  if (!/^[a-z0-9]{3,}/.test(slug)) slug = "ai-story-" + Date.now().toString(36);
  let tags = Array.isArray(s.emotionTags)
    ? s.emotionTags.map((t) => String(t).slice(0, 8)).slice(0, 3)
    : ["治愈"];
  tags = tags.filter((t) => TAG_POOL.includes(t));
  if (!tags.length) tags = ["治愈"];
  // 去掉已有的「AI 生成」前缀，避免面板二次保存时叠加
  const noteBase = String(s.sourceNote || "").replace(/^AI 生成[；，,\s]*/, "");
  return {
    slug,
    title: title.slice(0, 128),
    hook: String(s.hook || "").trim().slice(0, 255) || title.slice(0, 40),
    emotionTags: tags,
    category: CATEGORIES.includes(s.category) ? s.category : "人文",
    city: CITIES.includes(s.city) ? s.city : "其他",
    script,
    // 去掉已有的「AI 生成」前缀再统一添加，避免面板二次保存时前缀叠加
    sourceNote: (
      "AI 生成，未经事实核查" + (noteBase ? "；" + noteBase : "")
    ).slice(0, 500),
    durationSec: Math.max(60, Math.round(script.length / 4.5)), // 与 App 端 CHARS_PER_SEC 同口径
  };
}

/** ai_tasks 留痕 */
async function logTask(type, input, result, status) {
  await pool.query(
    "INSERT INTO ai_tasks (story_id, type, input_material, status, result) VALUES (NULL, ?, ?, ?, ?)",
    [type, JSON.stringify(input || {}), status, result ? JSON.stringify(result) : null]
  );
}

// POST /api/admin/ai/generate
router.post("/generate", async (req, res) => {
  const { topic, city, material, style } = req.body || {};
  if (typeof topic !== "string" || !topic.trim()) {
    return res.status(400).json({ error: "请填写故事主题（景点/地点名称）" });
  }
  if (!config.ai.apiKey) {
    return res.status(503).json({ error: "AI 服务未配置，请先在 server/.env 设置 DEEPSEEK_API_KEY" });
  }
  const styleText = STYLES.includes(style) ? style : "治愈";
  const userPrompt =
    `主题/景点：${topic.trim()}\n城市：${city || "待定"}\n风格：${styleText}\n` +
    `参考素材：${material && material.trim() ? material.trim().slice(0, 2000) : "无"}`;

  let story;
  try {
    const r = await fetch(`${config.ai.apiBase}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + config.ai.apiKey,
      },
      body: JSON.stringify({
        model: config.ai.model,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.8,
        max_tokens: 2000,
        response_format: { type: "json_object" },
      }),
      signal: AbortSignal.timeout(60000),
    });
    if (!r.ok) {
      const t = await r.text().catch(() => "");
      throw new Error("DeepSeek HTTP " + r.status + " " + t.slice(0, 120));
    }
    const data = await r.json();
    const raw = data.choices && data.choices[0] && data.choices[0].message
      ? data.choices[0].message.content
      : "";
    let parsed;
    try {
      parsed = JSON.parse(String(raw).replace(/```json|```/g, "").trim());
    } catch (_) {
      throw new Error("模型未返回合法 JSON");
    }
    story = normalizeStory(parsed, topic);
    if (!story) throw new Error("生成的正文过短或缺少标题");
  } catch (e) {
    await logTask("rewrite", { topic, city, material, style }, null, "failed");
    return res.status(502).json({ error: "AI 生成失败：" + e.message });
  }
  await logTask("rewrite", { topic, city, material, style }, story, "done");
  res.json({ story });
});

// POST /api/admin/ai/stories
router.post("/stories", async (req, res) => {
  const { story, publish } = req.body || {};
  const s = normalizeStory(story, story && story.title);
  if (!s) return res.status(400).json({ error: "故事数据不完整（需标题与至少 100 字正文）" });

  // slug 查重：重名追加 -2、-3…
  let slug = s.slug;
  const [existRows] = await pool.query("SELECT id FROM stories WHERE slug = ?", [slug]);
  if (existRows.length) {
    let n = 2;
    for (;;) {
      const cand = `${slug}-${n}`;
      const [rows] = await pool.query("SELECT id FROM stories WHERE slug = ?", [cand]);
      if (!rows.length) { slug = cand; break; }
      n += 1;
    }
  }

  const status = publish ? 2 : 0;
  const [r] = await pool.query(
    `INSERT INTO stories
       (slug, title, hook, emotion_tags, script, duration_sec, source_note, city, status, play_count, published_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ${publish ? "NOW()" : "NULL"})`,
    [slug, s.title, s.hook, JSON.stringify(s.emotionTags), s.script, s.durationSec, s.sourceNote, s.city, status]
  );
  const storyId = Number(r.insertId);

  // 城市能对上坐标 → 自动建点位（App 地图 pin 与距离正常显示）
  const coords = CITY_COORDS[s.city];
  if (coords) {
    const [pr] = await pool.query(
      "INSERT INTO points (name, city, lat, lng, radius_m, address) VALUES (?, ?, ?, ?, 200, '')",
      [s.title.slice(0, 64), s.city, coords[0], coords[1]]
    );
    await pool.query("INSERT INTO story_points (story_id, point_id, sort) VALUES (?, ?, 0)", [
      storyId,
      Number(pr.insertId),
    ]);
  }
  res.json({ storyId, slug, status });
});

// POST /api/admin/ai/tts
router.post("/tts", async (req, res) => {
  const storyId = Number((req.body || {}).storyId);
  if (!Number.isInteger(storyId) || storyId <= 0) {
    return res.status(400).json({ error: "storyId 不正确" });
  }
  const [[story]] = await pool.query("SELECT id, script FROM stories WHERE id = ?", [storyId]);
  if (!story) return res.status(404).json({ error: "故事不存在" });
  if (!story.script || !story.script.trim()) {
    return res.status(400).json({ error: "故事没有正文，无法配音" });
  }

  const audioRoot = path.join(__dirname, "..", "..", "audio");
  // toFile 在给定目录内写固定文件名 audio.mp3，故每个故事用独立子目录避免互相覆盖
  const outDir = path.join(audioRoot, `ai-${storyId}-${Date.now().toString(36)}`);
  fs.mkdirSync(outDir, { recursive: true });
  try {
    const tts = new MsEdgeTTS();
    await tts.setMetadata("zh-CN-XiaoxiaoNeural", OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);
    const { audioFilePath } = await tts.toFile(outDir, story.script);
    if (!audioFilePath) throw new Error("未生成音频文件");
    const url = "/audio/" + path.relative(audioRoot, audioFilePath).replace(/\\/g, "/");
    await pool.query("UPDATE stories SET audio_url = ? WHERE id = ?", [url, storyId]);
    await logTask("tts", { storyId }, { audioUrl: url }, "done");
    res.json({ ok: true, audioUrl: url });
  } catch (e) {
    await logTask("tts", { storyId }, null, "failed");
    res.status(502).json({ error: "语音合成失败：" + e.message });
  }
});

// GET /api/admin/ai/list
router.get("/list", async (req, res) => {
  const [rows] = await pool.query(
    `SELECT id, slug, title, city, status, audio_url AS audioUrl, created_at AS createdAt
       FROM stories
      WHERE source_note LIKE 'AI 生成%'
      ORDER BY id DESC
      LIMIT 20`
  );
  res.json({ stories: rows });
});

module.exports = router;
