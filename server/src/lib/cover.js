/**
 * AI 故事封面生成：本地合成 SVG（无外部图片依赖，离线可用）。
 * 内置故事的封面是 unsplash 外链（国内网络不稳），AI 故事改为
 * 服务端按「城市+类别」配色生成渐变插画风封面，写盘后经 /covers 静态服务。
 */
const fs = require("fs");
const path = require("path");

const COVER_ROOT = path.join(__dirname, "..", "..", "covers");

// 类别 → 渐变配色（左上深 → 右下亮）
const PALETTES = {
  历史: ["#7c3f0c", "#d9933d"],
  传说: ["#4c1d95", "#8b5cf6"],
  地质: ["#115e59", "#14b8a6"],
  人文: ["#9f1239", "#fb7185"],
};
const FALLBACK = ["#4c1d95", "#8b5cf6"];

// 远山轮廓变体（按 slug 哈希取模，同一故事封面稳定）
const MOUNTAINS = [
  "M0,500 L0,368 Q110,312 210,352 T400,336 T600,346 T800,324 L800,500 Z",
  "M0,500 L0,412 Q150,368 300,392 T600,384 L800,404 L800,500 Z",
  "M0,500 L0,392 Q130,296 270,376 T520,352 T800,366 L800,500 Z",
];

/** djb2 哈希：slug → 稳定的 0..n-1 变体选择 */
function hashN(str, n) {
  let h = 5381;
  for (let i = 0; i < str.length; i++) h = ((h << 5) + h + str.charCodeAt(i)) >>> 0;
  return h % n;
}

/** XML 转义（标题/钩子来自 AI，可能含特殊字符） */
function esc(s) {
  return String(s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** 中文按字符换行（标题两行、钩子两行内截断） */
function wrap(text, perLine, maxLines) {
  const chars = [...String(text || "")];
  const lines = [];
  for (let i = 0; i < chars.length && lines.length < maxLines; i += perLine) {
    lines.push(chars.slice(i, i + perLine).join(""));
  }
  return lines;
}

/**
 * 生成封面 SVG 文本。
 * @param {{title:string, city?:string, category?:string, hook?:string, slug:string}} story
 */
function buildCoverSvg(story) {
  const [c1, c2] = PALETTES[story.category] || FALLBACK;
  const seed = hashN(story.slug || "", 3);
  const mountains = MOUNTAINS[seed];
  const sunX = 560 + seed * 90;

  // 标题：单行 ≤10 字用大字号，两行缩小；过长截断加省略号
  const titleLines = wrap(story.title, 10, 2);
  const titleFont = titleLines.length > 1 ? 46 : 60;
  const titleEls = titleLines
    .map(
      (ln, i) =>
        `<text x="400" y="${272 + i * (titleFont + 14)}" font-size="${titleFont}" font-weight="700" fill="#ffffff" text-anchor="middle" style="text-shadow:0 4px 18px rgba(0,0,0,.35)">${esc(ln)}</text>`
    )
    .join("\n  ");

  // 钩子：标题下方小字，最多 2 行
  const hookLines = wrap(story.hook, 18, 2);
  const hookEls = hookLines
    .map(
      (ln, i) =>
        `<text x="400" y="${352 + i * 34}" font-size="24" fill="rgba(255,255,255,.88)" text-anchor="middle">${esc(ln)}</text>`
    )
    .join("\n  ");

  const chip = esc(`${story.city || "流幻"} · ${story.category || "人文"}`);
  const chipW = [...chip].length * 26 + 44;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="500" viewBox="0 0 800 500">
  <style>
    text { font-family: "PingFang SC", "Microsoft YaHei", "Noto Sans SC", sans-serif; }
  </style>
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${c1}"/>
      <stop offset="1" stop-color="${c2}"/>
    </linearGradient>
  </defs>
  <rect width="800" height="500" fill="url(#bg)"/>
  <circle cx="${sunX}" cy="118" r="72" fill="rgba(255,255,255,.20)"/>
  <circle cx="${sunX - 26}" cy="104" r="52" fill="rgba(255,255,255,.14)"/>
  <circle cx="96" cy="452" r="180" fill="rgba(255,255,255,.07)"/>
  <circle cx="736" cy="470" r="120" fill="rgba(255,255,255,.08)"/>
  <path d="${mountains}" fill="rgba(0,0,0,.16)"/>
  <path d="M0,500 L0,438 Q180,404 360,432 T800,418 L800,500 Z" fill="rgba(0,0,0,.22)"/>
  <rect x="44" y="42" width="${chipW}" height="52" rx="26" fill="rgba(0,0,0,.18)"/>
  <text x="66" y="77" font-size="26" fill="rgba(255,255,255,.92)">${chip}</text>
  ${titleEls}
  ${hookEls}
  <text x="756" y="468" font-size="18" fill="rgba(255,255,255,.5)" text-anchor="end">流光幻旅 · 边走边听</text>
</svg>
`;
}

/**
 * 为故事生成封面文件并返回相对 URL。
 * @param {{id:number, slug:string, title:string, city?:string, category?:string, hook?:string}} story
 * @returns {string} 如 "/covers/ai-27.svg"
 */
function makeCover(story) {
  fs.mkdirSync(COVER_ROOT, { recursive: true });
  const file = path.join(COVER_ROOT, `ai-${story.id}.svg`);
  fs.writeFileSync(file, buildCoverSvg(story), "utf8");
  return `/covers/ai-${story.id}.svg`;
}

module.exports = { makeCover, buildCoverSvg };
