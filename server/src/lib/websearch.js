/**
 * 博查联网搜索封装（按需生成用）：
 *   bochaAiSearch(query)  → 速览 { summary, sources } | null
 *   bochaWebSearch(query) → 素材 { material } | null
 *
 * 未配置 key / 超时 / 上游失败一律返回 null，由调用方降级（spec §5）。
 * 博查返回结构随版本演进，解析做多路径防御；取不到任何可用字段视为失败。
 */
const config = require("../config");

const BOCHA_BASE = "https://api.bocha.cn/v1";
const TIMEOUT = 15000;

async function bochaPost(path, body) {
  if (!config.bocha.apiKey) return null;
  const r = await fetch(BOCHA_BASE + path, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + config.bocha.apiKey,
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(TIMEOUT),
  });
  if (!r.ok) return null;
  return r.json();
}

/** 从对象里摘第一个非空字符串字段（容错不同版本的字段名） */
function pickString(obj, keys) {
  if (!obj || typeof obj !== "object") return "";
  for (const k of keys) {
    const v = obj[k];
    if (typeof v === "string" && v.trim()) return v.trim();
    if (Array.isArray(v) && v.length && typeof v[0] === "string" && v[0].trim()) {
      return v[0].trim();
    }
  }
  return "";
}

/** AI Search：现成百科/摘要信息 → 速览（秒级） */
async function bochaAiSearch(query) {
  let data;
  try {
    data = await bochaPost("/ai-search", { query, freshness: "noLimit", summary: true });
  } catch (_) {
    return null;
  }
  if (!data) return null;
  const d = data.data || data;
  // 摘要：常见字段 answer / summary / content；卡片里的百科摘要兜底
  let summary = pickString(d, ["answer", "summary", "content"]);
  const sources = [];
  const cards = d.cards || [];
  for (const c of cards) {
    if (!summary) summary = pickString(c, ["summary", "content", "description"]);
    const title = pickString(c, ["title", "name"]);
    const url = pickString(c, ["url", "link", "source_url"]);
    if (title) sources.push({ title, url: url || "" });
  }
  if (!sources.length) {
    const items = d.webPages || d.organic || [];
    for (const it of items.slice(0, 4)) {
      const title = pickString(it, ["name", "title"]);
      const url = pickString(it, ["url", "link"]);
      if (title) sources.push({ title, url: url || "" });
    }
  }
  if (!summary && !sources.length) return null;
  return { summary: summary || "", sources: sources.slice(0, 4) };
}

/** Web Search：原文素材 → DeepSeek 写稿输入 */
async function bochaWebSearch(query) {
  let data;
  try {
    data = await bochaPost("/web-search", { query, count: 5, freshness: "noLimit" });
  } catch (_) {
    return null;
  }
  if (!data) return null;
  const d = data.data || data;
  const pages = d.webPages || d.organic || d.value || [];
  const chunks = [];
  for (const p of pages.slice(0, 4)) {
    const title = pickString(p, ["name", "title"]);
    const snippet = pickString(p, ["snippet", "summary", "description", "content"]);
    if (snippet) chunks.push((title ? `${title}：` : "") + snippet);
  }
  if (!chunks.length) return null;
  return { material: chunks.join("\n\n").slice(0, 3000) };
}

module.exports = { bochaAiSearch, bochaWebSearch };
