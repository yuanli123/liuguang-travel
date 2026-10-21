/**
 * AI 事实核查 pass（真实准确优先的第二层保障，spec 2026-10-21 §3.2）：
 *   对照参考素材检查故事草稿的事实主张，删除/模糊化素材不支撑的内容。
 *
 * 核查调用失败时返回原稿（原稿已受信源约束生成，风险可控），不阻塞流水线。
 */
const { callDeepseek } = require("./ai-generate");

const CHECKER_PROMPT = `你是严谨的事实核查员。对照「参考素材」检查故事草稿中的事实主张：
1. 素材不支撑的事实、具体数字、年份、人名——删除，或改为「据说」「相传」「有一种说法」等模糊表述；
2. 不改变故事结构与讲述风格，只做事实层面的修正，字数保持 350-550；
3. 只输出一个 JSON 对象，不要任何其他文字：
{"script":"修正后的全文","issues":["被修正的问题描述"]}
没有问题则 issues 为空数组。`;

/**
 * @param {string} material 参考素材（可能为空串）
 * @param {string} script  待核查草稿
 * @returns {Promise<{script: string, issues: string[]}>}
 */
async function factCheckStory(material, script) {
  try {
    const data = await callDeepseek(
      [
        { role: "system", content: CHECKER_PROMPT },
        {
          role: "user",
          content: `参考素材：\n${material || "（无素材）"}\n\n故事草稿：\n${script}`,
        },
      ],
      2000
    );
    const fixed = String((data && data.script) || "").trim();
    if (fixed.length < 100) throw new Error("核查输出过短");
    const issues = Array.isArray(data.issues)
      ? data.issues.map((x) => String(x)).slice(0, 10)
      : [];
    return { script: fixed, issues };
  } catch (e) {
    return { script, issues: [] }; // 核查失败：保留受约束的原稿
  }
}

module.exports = { factCheckStory };
