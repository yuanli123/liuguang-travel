/**
 * 批量故事生产线迁移（幂等，可重复执行）：
 *   ai_tasks.type 枚举扩展 'batch'（批量故事生产留痕）
 *
 * 用法（在 server/ 目录下）：
 *   npm run db:migrate-batch
 */
const mysql = require("mysql2/promise");
const { db } = require("../src/config");

async function migrate() {
  const conn = await mysql.createConnection({
    host: db.host,
    port: db.port,
    user: db.user,
    password: db.password,
    database: db.database,
    charset: "utf8mb4",
  });
  try {
    await conn.query(
      `ALTER TABLE ai_tasks
       MODIFY COLUMN type ENUM('extract','rewrite','tts','on-demand','batch') NOT NULL
       COMMENT '任务类型：结构化提取/故事化改写/语音合成/按需生成/批量生产'`
    );
    console.log("ai_tasks.type 已扩展 batch 枚举");
  } catch (e) {
    console.error("迁移失败:", e.message);
    process.exitCode = 1;
  } finally {
    await conn.end();
  }
}

migrate();
