/**
 * 讲述模式迁移（幂等，可重复执行）：
 *   1. 建 story_variants 表（与 schema.sql 同构）
 *   2. stories 表补 default_mode 列（information_schema 检查，容忍列已存在）
 *   3. 存量故事写入 mode='story' 变体（12 篇手写稿文风即「娓娓道来」，INSERT IGNORE 幂等）
 *
 * 用法（在 server/ 目录下）：
 *   npm run db:migrate-variants
 *
 * 迁移后仍缺 chat/suspense/pingshu 变体 —— 由 scripts/backfill-variants.js 批量补全。
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
      `CREATE TABLE IF NOT EXISTS story_variants (
         id           BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '变体ID',
         story_id     BIGINT UNSIGNED NOT NULL COMMENT '故事ID',
         mode         VARCHAR(20)     NOT NULL COMMENT '讲述模式：chat日常聊天/story娓娓道来/suspense悬念夜谈/pingshu说书人',
         script       TEXT            NOT NULL COMMENT '该模式脚本正文',
         audio_url    VARCHAR(255)    NULL COMMENT '配音地址（NULL=未配音，播放时回退浏览器语音合成）',
         voice        VARCHAR(64)     NOT NULL COMMENT 'edge-tts 音色名',
         duration_sec INT UNSIGNED    NOT NULL DEFAULT 0 COMMENT '预计收听时长（秒）',
         created_at   DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
         PRIMARY KEY (id),
         UNIQUE KEY uk_story_mode (story_id, mode),
         KEY idx_story (story_id)
       ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='故事讲述模式变体（每模式一份脚本与配音）'`
    );
    console.log("story_variants 表已就绪");

    const [cols] = await conn.query(
      `SELECT COUNT(*) AS n FROM information_schema.columns
        WHERE table_schema = ? AND table_name = 'stories' AND column_name = 'default_mode'`,
      [db.database]
    );
    if (!cols[0].n) {
      await conn.query(
        `ALTER TABLE stories ADD COLUMN default_mode VARCHAR(20) NOT NULL DEFAULT 'chat' COMMENT '默认讲述模式（chat/story/suspense/pingshu）'`
      );
      console.log("stories.default_mode 列已添加");
    } else {
      console.log("stories.default_mode 列已存在，跳过");
    }

    const [rows] = await conn.query(
      `SELECT id, script, audio_url, duration_sec FROM stories
        WHERE script IS NOT NULL AND script <> ''`
    );
    let inserted = 0;
    for (const r of rows) {
      const [res] = await conn.query(
        `INSERT IGNORE INTO story_variants
           (story_id, mode, script, audio_url, voice, duration_sec)
         VALUES (?, 'story', ?, ?, 'zh-CN-XiaoxiaoNeural', ?)`,
        [r.id, r.script, r.audio_url, Number(r.duration_sec) || 0]
      );
      inserted += res.affectedRows;
    }
    console.log(`存量 ${rows.length} 篇故事，写入 story 变体 ${inserted} 条（已存在的跳过）`);
  } finally {
    await conn.end();
  }
}

if (require.main === module) {
  migrate()
    .then(() => process.exit(0))
    .catch((e) => {
      console.error("迁移失败：" + e.message);
      console.error("提示：请确认 MySQL 服务已启动，且 server/.env 中的 DB_PASSWORD 正确。");
      process.exit(1);
    });
}

module.exports = { migrate };
