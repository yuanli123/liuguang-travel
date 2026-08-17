/**
 * 一次性开发工具：从 app.js 提取 STORIES 数组 → 写入 stories.json
 *
 * 用法（在 server/ 目录下）：
 *   npm run extract-stories
 *
 * 只在 app.js 的故事数据变动后重跑；stories.json 提交入库，
 * seed.js 只读 JSON，不依赖 app.js（浏览器脚本，不能直接 require）。
 */
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const APP_JS = path.join(__dirname, "..", "..", "app.js");
const OUT_JSON = path.join(__dirname, "stories.json");

const REQUIRED_FIELDS = [
  "id", "title", "spot", "city", "mood", "category",
  "hook", "durationSec", "plays", "cover", "lat", "lng", "script", "source",
];

/** 从源码中定位 `const STORIES = [` 的整个数组字面量（含尾 `]`，不含前导分号） */
function extractArrayLiteral(src) {
  const marker = src.indexOf("const STORIES = ");
  if (marker === -1) throw new Error("在 app.js 中找不到 `const STORIES =`");
  const open = src.indexOf("[", marker);
  if (open === -1) throw new Error("`const STORIES =` 后面找不到数组起始 `[`");

  let depth = 0;
  let state = "normal"; // normal | dq(双引号字符串)
  for (let i = open; i < src.length; i++) {
    const ch = src[i];
    const next = src[i + 1];
    if (state === "dq") {
      if (ch === "\\" && next) i++; // 跳过转义字符
      else if (ch === '"') state = "normal";
      continue;
    }
    if (ch === '"') { state = "dq"; continue; }
    if (ch === "[") depth++;
    else if (ch === "]") {
      depth--;
      if (depth === 0) return src.slice(open, i + 1);
    }
  }
  throw new Error("STORIES 数组没有配对的结尾 `]`");
}

function main() {
  const src = fs.readFileSync(APP_JS, "utf8");
  const literal = extractArrayLiteral(src);

  // 纯数据防护：出现模板字符串/插值说明故事数据不再是字面量，直接失败并给中文提示
  if (literal.includes("`") || literal.includes("${")) {
    throw new Error(
      "app.js 的 STORIES 数组里出现了模板字符串或表达式，请先改回纯数据后再运行本脚本"
    );
  }

  // 空沙箱求值：字面量是纯数据，不需要任何全局对象
  const stories = vm.runInNewContext(literal, {});

  if (!Array.isArray(stories) || stories.length !== 12) {
    throw new Error(`STORIES 应为 12 条故事，实际提取到 ${Array.isArray(stories) ? stories.length : "非数组"}`);
  }
  const ids = new Set();
  for (const s of stories) {
    for (const f of REQUIRED_FIELDS) {
      if (s[f] === undefined) throw new Error(`故事缺少字段：${f}（id=${s.id ?? "未知"}）`);
    }
    if (ids.has(s.id)) throw new Error(`故事 id 重复：${s.id}`);
    ids.add(s.id);
  }

  fs.writeFileSync(OUT_JSON, JSON.stringify(stories, null, 2) + "\n", "utf8");
  console.log(`已从 app.js 提取 ${stories.length} 条故事 → server/db/stories.json`);
}

try {
  main();
} catch (e) {
  console.error("提取失败：" + e.message);
  process.exit(1);
}
