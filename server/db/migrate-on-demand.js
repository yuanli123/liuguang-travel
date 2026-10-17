/**
 * 按需生成迁移（幂等，可重复执行）：
 *   ai_tasks.type 枚举扩展 'on-demand'（拍景点·现场听故事留痕）
 *
 * 用法（在 server/ 目录下）：
 *   npm run db:migrate-on-demand
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
       MODIFY COLUMN type ENUM('extract','rewrite','tts','on-demand') NOT NULL
       COMMENT '任务类型：结构化提取/故事化改写/语音合成/按需生成'`
    );
    console.log("ai_tasks.type 已扩展 on-demand 枚举");
  } catch (e) {
    // 幂等：列已是目标定义时 MySQL 不会报错，这里兜底提示其他问题
    console.error("迁移失败:", e.message);
    process.exitCode = 1;
  } finally {
    await conn.end();
  }
}

migrate();
