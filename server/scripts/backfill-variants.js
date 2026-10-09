/**
 * 批量补全讲述模式变体（一次性任务，独立 CLI）：
 *   存量故事的 story 变体已由 db/migrate-variants.js 写入（现有手写稿=娓娓道来），
 *   本脚本以 story 脚本为源，并行风格转换出 chat / suspense / pingshu 三个变体。
 *
 * 用法（在 server/ 目录下）：
 *   npm run backfill-variants -- --dry-run           # 只列计划，不调用 AI
 *   npm run backfill-variants -- --limit 2           # 先跑 2 篇验证文风与事实
 *   npm run backfill-variants                        # 全量（断点续跑，已齐全的故事自动跳过）
 *
 * 每篇生成留痕 ai_tasks（status=failed 含错误信息），失败的故事下次运行自动重试。
 */
const { MODE_KEYS, voiceForMode } = require("../src/lib/modes");
const { transferModes } = require("../src/lib/ai-generate");
const pool = require("../src/db");

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const limitIdx = args.indexOf("--limit");
const limit = limitIdx >= 0 ? Number(args[limitIdx + 1]) || 0 : 0;

/** 变体齐全的判定：chat/story/suspense/pingshu 全部存在 */
function isComplete(modes) {
  return MODE_KEYS.every((k) => modes.includes(k));
}

async function main() {
  const [rows] = await pool.query(
    `SELECT id, slug, title FROM stories
      WHERE script IS NOT NULL AND script <> '' ORDER BY id`
  );
  const targets = [];
  for (const s of rows) {
    const [vRows] = await pool.query("SELECT mode FROM story_variants WHERE story_id = ?", [s.id]);
    const modes = vRows.map((r) => r.mode);
    if (isComplete(modes)) continue;
    targets.push({ ...s, modes });
  }
  if (limit > 0) targets.length = Math.min(targets.length, limit);

  console.log(`共 ${rows.length} 篇故事，需补变体 ${targets.length} 篇${dryRun ? "（DRY-RUN，不调用 AI）" : ""}`);
  for (const t of targets) {
    const missing = MODE_KEYS.filter((k) => !t.modes.includes(k));
    console.log(`  #${t.id} ${t.title}：缺 [${missing.join(", ")}]`);
  }
  if (dryRun) return;

  let okCount = 0;
  let failCount = 0;
  for (const t of targets) {
    const missing = MODE_KEYS.filter((k) => !t.modes.includes(k));
    const [vRows] = await pool.query(
      "SELECT script FROM story_variants WHERE story_id = ? AND mode = 'story'",
      [t.id]
    );
    const src = (vRows[0] || {}).script;
    if (!src) {
      console.error(`  #${t.id} ${t.title}：无 story 变体源脚本，跳过`);
      continue;
    }
    process.stdout.write(`  #${t.id} ${t.title} → [${missing.join(", ")}] ... `);
    const results = await transferModes(src, missing);
    for (const r of results) {
      if (!r.script) {
        console.log(`\n    ✗ ${r.mode} 失败：${r.error}`);
        failCount += 1;
        continue;
      }
      await pool.query(
        `INSERT IGNORE INTO story_variants (story_id, mode, script, voice, duration_sec)
         VALUES (?, ?, ?, ?, ?)`,
        [t.id, r.mode, r.script, voiceForMode(r.mode), Math.max(60, Math.round(r.script.length / 4.5))]
      );
      console.log(`\n    ✓ ${r.mode}（${r.script.length} 字）`);
      okCount += 1;
    }
    await pool.query(
      `INSERT INTO ai_tasks (story_id, type, input_material, status, result)
       VALUES (?, 'rewrite', ?, 'done', ?)`,
      [t.id, JSON.stringify({ sourceMode: "story", missing }), JSON.stringify(results)]
    );
  }
  console.log(`\n完成：成功 ${okCount} 个变体，失败 ${failCount} 个（重跑本脚本自动补失败项）`);
}

main()
  .then(() => pool.end().then(() => process.exit(0)))
  .catch(async (e) => {
    console.error("批量补全失败：" + e.message);
    console.error("提示：请确认 MySQL 服务已启动、server/.env 已配置 DEEPSEEK_API_KEY。");
    await pool.end().catch(() => {});
    process.exit(1);
  });
