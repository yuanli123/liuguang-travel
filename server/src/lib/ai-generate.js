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

module.exports = { parseJsonLoose, callDeepseek, transferScript, transferModes };
