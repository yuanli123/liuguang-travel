/**
 * DeepSeek 生成管线（AI 故事工坊路由与批量补全脚本共用）：
 *   callDeepseek —— 底层调用 + JSON 解析
 *   transferModes —— 第二阶段：源脚本 → 各目标模式的风格转换（并行，单模式失败不抛错）
 *
 * 生成采用两阶段防事实漂移：第一阶段生成元数据 + chat 脚本（在 ai.js 路由里），
 * 第二阶段把 chat/现有脚本作为输入做风格转换，保证 4 个模式讲同一套事实。
 */
const config = require("../config");
const { BY_KEY, TRANSFER_RULES } = require("./modes");

/** 解析模型返回内容里的 JSON（容忍 ```json 围栏） */
function parseJsonLoose(text) {
  return JSON.parse(String(text || "").replace(/```json|```/g, "").trim());
}

/** 一次 DeepSeek 对话补全，返回解析后的对象 */
async function callDeepseek(messages, maxTokens = 2000) {
  if (!config.ai.apiKey) {
    throw new Error("AI 服务未配置，请先在 server/.env 设置 DEEPSEEK_API_KEY");
  }
  const r = await fetch(`${config.ai.apiBase}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + config.ai.apiKey,
    },
    body: JSON.stringify({
      model: config.ai.model,
      messages,
      temperature: 0.8,
      max_tokens: maxTokens,
      response_format: { type: "json_object" },
    }),
    signal: AbortSignal.timeout(60000),
  });
  if (!r.ok) {
    const t = await r.text().catch(() => "");
    throw new Error("DeepSeek HTTP " + r.status + " " + t.slice(0, 120));
  }
  const data = await r.json();
  const raw =
    data.choices && data.choices[0] && data.choices[0].message
      ? data.choices[0].message.content
      : "";
  return parseJsonLoose(raw);
}

/** 单模式风格转换：源脚本 → 目标模式脚本 */
async function transferScript(sourceScript, modeKey) {
  const m = BY_KEY[modeKey];
  const system =
    `你是旅行故事编剧。把下面这篇景点故事脚本改写成「${m.label}」的讲述风格。${m.styleHint} ` +
    TRANSFER_RULES;
  const data = await callDeepseek(
    [
      { role: "system", content: system },
      { role: "user", content: sourceScript },
    ],
    1500
  );
  const script = String(data && data.script || "").trim();
  if (script.length < 100) throw new Error("转换结果过短");
  return script;
}

/**
 * 并行风格转换。返回 [{ mode, script|null, error|null }]；
 * 单模式失败不抛出，由调用方决定是否重试/补变体。
 */
async function transferModes(sourceScript, modeKeys) {
  const results = await Promise.allSettled(
    modeKeys.map((key) => transferScript(sourceScript, key))
  );
  return modeKeys.map((key, i) => {
    const r = results[i];
    if (r.status === "fulfilled") return { mode: key, script: r.value, error: null };
    return { mode: key, script: null, error: r.reason && r.reason.message || "转换失败" };
  });
}

/* ================================================================
   故事生成公共口径（AI 故事工坊与按需生成共用）
   ================================================================ */

const { STYLE_HINTS } = require("./modes");

const STORY_CITIES = ["北京", "上海", "杭州", "苏州", "成都", "西安", "南京", "厦门"];
const STORY_CATEGORIES = ["历史", "传说", "地质", "人文"];
const STORY_TAG_POOL = ["治愈", "震撼", "怀旧", "神秘", "温暖", "悲壮"];

const STORY_SYSTEM_PROMPT = `你是一位资深的旅行故事编剧，擅长把景点写成适合边走边听的沉浸式故事音频脚本。
根据用户提供的主题/景点与素材，创作一篇故事。要求：
1. 标题：不超过 20 字，有画面感
2. 钩子 hook：不超过 40 字，制造悬念或反差，让人想继续听
3. 正文 script：350-550 字，有具体场景细节，包含一个冲突、悬念或反转，结尾有余味；段落用换行分隔。讲述风格：${STYLE_HINTS.chat}
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
  tags = tags.filter((t) => STORY_TAG_POOL.includes(t));
  if (!tags.length) tags = ["治愈"];
  // 去掉已有的「AI 生成」前缀，避免面板二次保存时叠加
  const noteBase = String(s.sourceNote || "").replace(/^AI 生成[；，,\s]*/, "");
  return {
    slug,
    title: title.slice(0, 128),
    hook: String(s.hook || "").trim().slice(0, 255) || title.slice(0, 40),
    emotionTags: tags,
    category: STORY_CATEGORIES.includes(s.category) ? s.category : "人文",
    city: STORY_CITIES.includes(s.city) ? s.city : "其他",
    script,
    // 去掉已有的「AI 生成」前缀再统一添加，避免面板二次保存时前缀叠加
    sourceNote: (
      "AI 生成，未经事实核查" + (noteBase ? "；" + noteBase : "")
    ).slice(0, 500),
    durationSec: Math.max(60, Math.round(script.length / 4.5)), // 与 App 端 CHARS_PER_SEC 同口径
  };
}

module.exports = {
  parseJsonLoose,
  callDeepseek,
  transferScript,
  transferModes,
  STORY_CITIES,
  STORY_CATEGORIES,
  STORY_TAG_POOL,
  STORY_SYSTEM_PROMPT,
  normalizeStory,
};
