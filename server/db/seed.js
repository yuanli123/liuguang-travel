/**
 * 种子数据：12 篇故事 + 12 个点位 + 4 个主题 + 关联表
 *
 * 用法（在 server/ 目录下）：
 *   npm run seed          # 单独重灌种子
 *   npm run db:init       # 建库建表后自动执行本脚本
 *
 * 幂等：可重复执行，已存在的数据会被更新而不是重复插入。
 * 全部中文文本走参数化查询，SQL 内零内联字面量。
 */
const fs = require("fs");
const path = require("path");
const pool = require("../src/db");

const STORIES = JSON.parse(
  fs.readFileSync(path.join(__dirname, "stories.json"), "utf8")
);
const TOPIC_NAMES = ["传说", "历史", "人文", "地质"];

/** "8.2万" → 82000；兼容纯数字（未来数据可能直接用整数） */
function parsePlays(s) {
  if (typeof s === "number") return s;
  const str = String(s).trim();
  if (str.includes("万")) {
    const n = Math.round(parseFloat(str) * 10000);
    return Number.isNaN(n) ? 0 : n;
  }
  const n = parseInt(str, 10);
  return Number.isNaN(n) ? 0 : n;
}

/**
 * 通用「查或插」助手：先按唯一条件查 id，查不到再插入。
 * 比 ON DUPLICATE KEY UPDATE 直观，且能拿到已存在行的 id。
 */
async function upsertGetId(conn, table, whereSql, whereParams, columns, params) {
  const [rows] = await conn.query(
    `SELECT id FROM ${table} WHERE ${whereSql}`,
    whereParams
  );
  if (rows.length) return rows[0].id;
  const [r] = await conn.query(
    `INSERT INTO ${table} (${columns}) VALUES (${params.map(() => "?").join(", ")})`,
    params
  );
  return r.insertId;
}

async function seed() {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    // 1. 主题（传说/历史/人文/地质）
    const topicIds = new Map();
    for (const name of TOPIC_NAMES) {
      const id = await upsertGetId(
        conn, "topics", "name = ?", [name], "name", [name]
      );
      topicIds.set(name, id);
    }

    // 2. 故事 + 点位 + 关联
    for (const s of STORIES) {
      // 故事 upsert（slug 唯一键；行别名语法需 MySQL 8.0.19+）
      await conn.query(
        `INSERT INTO stories
           (slug, title, hook, emotion_tags, script, duration_sec,
            cover_url, source_note, city, status, play_count, published_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 2, ?, NOW()) AS new
         ON DUPLICATE KEY UPDATE
           title = new.title,
           hook = new.hook,
           emotion_tags = new.emotion_tags,
           script = new.script,
           duration_sec = new.duration_sec,
           cover_url = new.cover_url,
           source_note = new.source_note,
           city = new.city,
           status = new.status,
           play_count = new.play_count`,
        [
          s.id, s.title, s.hook, JSON.stringify([s.mood]), s.script,
          s.durationSec, s.cover, s.source, s.city, parsePlays(s.plays),
        ]
      );
      // upsert 不返回已存在行的 id，统一按 slug 再查一次
      const [[storyRow]] = await conn.query(
        "SELECT id FROM stories WHERE slug = ?", [s.id]
      );
      const storyId = storyRow.id;

      // 点位：name 存完整景点名（如「颐和园 · 昆明湖」），坐标用真实经纬度
      const pointId = await upsertGetId(
        conn, "points", "name = ? AND city = ?", [s.spot, s.city],
        "name, city, lat, lng, radius_m, address",
        [s.spot, s.city, s.lat, s.lng, 200, s.spot]
      );

      // 故事-点位、故事-主题关联（已存在则忽略）
      await conn.query(
        "INSERT IGNORE INTO story_points (story_id, point_id, sort) VALUES (?, ?, 1)",
        [storyId, pointId]
      );
      const topicId = topicIds.get(s.category);
      if (!topicId) throw new Error(`未知类别「${s.category}」（故事 ${s.id}），需在 TOPIC_NAMES 中补充`);
      await conn.query(
        "INSERT IGNORE INTO story_topics (story_id, topic_id) VALUES (?, ?)",
        [storyId, topicId]
      );
    }

    await conn.commit();
    console.log(
      `种子数据完成：故事 ${STORIES.length} 条，点位 ${STORIES.length} 个，主题 ${TOPIC_NAMES.length} 个，关联已建立（重复执行安全）`
    );
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
}

module.exports = { seed };

// 直接运行：node db/seed.js
if (require.main === module) {
  seed()
    .then(() => pool.end())
    .catch((e) => {
      console.error("种子数据写入失败：" + e.message);
      pool.end().then(() => process.exit(1));
    });
}
