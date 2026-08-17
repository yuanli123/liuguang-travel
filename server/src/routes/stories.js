/** GET /api/stories 与 GET /api/stories/:id —— 故事列表与详情 */
const express = require("express");
const pool = require("../db");

const router = express.Router();

// 列表/详情共用的基础列；spot 取故事关联的第一个点位名，category 取关联主题名
// （FROM 单独拆开：详情需要在列清单里追加 script 等字段，不能拼在 FROM 之后）
const BASE_COLUMNS = `
    s.id, s.slug, s.title, s.hook, s.city,
    s.emotion_tags AS emotionTags,
    s.duration_sec AS durationSec,
    s.play_count AS playCount,
    s.cover_url AS cover,
    (SELECT p.name FROM story_points sp
       JOIN points p ON p.id = sp.point_id
      WHERE sp.story_id = s.id ORDER BY sp.sort LIMIT 1) AS spot,
    (SELECT t.name FROM story_topics st
       JOIN topics t ON t.id = st.topic_id
      WHERE st.story_id = s.id ORDER BY st.topic_id LIMIT 1) AS category
`;

const BASE_FROM = "FROM stories s";
const PUBLISHED = "s.status = 2 AND s.deleted_at IS NULL";

/** GET /api/stories?city=北京 —— 已上架故事列表 */
router.get("/", async (req, res) => {
  const { city } = req.query;
  const conditions = [PUBLISHED];
  const params = [];
  if (city) {
    conditions.push("s.city = ?");
    params.push(String(city));
  }
  const where = "WHERE " + conditions.join(" AND ");
  const [rows] = await pool.query(
    `SELECT ${BASE_COLUMNS} ${BASE_FROM} ${where} ORDER BY s.id ASC`,
    params
  );
  res.json({ stories: rows, total: rows.length });
});

/** GET /api/stories/:id —— 详情（slug 或数字 ID），含正文/信源/点位坐标 */
router.get("/:id", async (req, res) => {
  const id = req.params.id;
  // slug 是字符串；纯数字则按 ID 匹配
  const byId = /^\d+$/.test(id);
  const where = `WHERE (${byId ? "s.id = ?" : "s.slug = ?"}) AND ${PUBLISHED}`;
  const [rows] = await pool.query(
    `SELECT ${BASE_COLUMNS}, s.script, s.source_note AS sourceNote, s.audio_url AS audioUrl
     ${BASE_FROM} ${where}`,
    [byId ? Number(id) : id]
  );
  if (!rows.length) {
    return res.status(404).json({ error: "故事不存在或已下架" });
  }
  const story = rows[0];

  // 关联点位（mysql2 对 DECIMAL 返回字符串，需转 Number）
  const [points] = await pool.query(
    `SELECT p.id, p.name, p.city, p.lat, p.lng, p.radius_m AS radiusM, p.address
       FROM story_points sp
       JOIN points p ON p.id = sp.point_id
      WHERE sp.story_id = ? ORDER BY sp.sort`,
    [story.id]
  );
  story.points = points.map((p) => ({
    ...p,
    lat: Number(p.lat),
    lng: Number(p.lng),
  }));

  res.json({ story });
});

module.exports = router;
