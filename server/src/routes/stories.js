/** GET /api/stories、GET /api/stories/:id 与 POST /api/stories/:id/report */
const express = require("express");
const jwt = require("jsonwebtoken");
const pool = require("../db");
const config = require("../config");
const { extractToken } = require("../middleware/auth");

const router = express.Router();

// 列表/详情共用的基础列；spot 取故事关联的第一个点位名，category 取关联主题名
// （FROM 单独拆开：详情需要在列清单里追加 script 等字段，不能拼在 FROM 之后）
const BASE_COLUMNS = `
    s.id, s.slug, s.title, s.hook, s.city,
    s.emotion_tags AS emotionTags,
    s.duration_sec AS durationSec,
    s.play_count AS playCount,
    s.cover_url AS cover,
    s.audio_url AS audioUrl,
    (SELECT p.name FROM story_points sp
       JOIN points p ON p.id = sp.point_id
      WHERE sp.story_id = s.id ORDER BY sp.sort LIMIT 1) AS spot,
    (SELECT t.name FROM story_topics st
       JOIN topics t ON t.id = st.topic_id
      WHERE st.story_id = s.id ORDER BY st.topic_id LIMIT 1) AS category,
    (SELECT p.lat FROM story_points sp
       JOIN points p ON p.id = sp.point_id
      WHERE sp.story_id = s.id ORDER BY sp.sort LIMIT 1) AS lat,
    (SELECT p.lng FROM story_points sp
       JOIN points p ON p.id = sp.point_id
      WHERE sp.story_id = s.id ORDER BY sp.sort LIMIT 1) AS lng
`;

const BASE_FROM = "FROM stories s";
const PUBLISHED = "s.status = 2 AND s.deleted_at IS NULL";

/** mysql2 通常已把 JSON 列解析成数组；个别配置下返回字符串，防御性再解析 */
function safeEmotionTags(v) {
  if (Array.isArray(v)) return v;
  if (typeof v === "string") {
    try {
      const parsed = JSON.parse(v);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}

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
  // C5 推荐逻辑：按播放量热度排序（MVP 简化规则；同热度按 id 稳定排序）
  const [rows] = await pool.query(
    `SELECT ${BASE_COLUMNS} ${BASE_FROM} ${where} ORDER BY s.play_count DESC, s.id ASC`,
    params
  );
  const stories = rows.map((r) => ({
    ...r,
    emotionTags: safeEmotionTags(r.emotionTags),
    lat: r.lat == null ? null : Number(r.lat),
    lng: r.lng == null ? null : Number(r.lng),
  }));
  res.json({ stories, total: stories.length });
});

/** GET /api/stories/:id —— 详情（slug 或数字 ID），含正文/信源/点位坐标 */
router.get("/:id", async (req, res) => {
  const id = req.params.id;
  // slug 是字符串；纯数字则按 ID 匹配
  const byId = /^\d+$/.test(id);
  const where = `WHERE (${byId ? "s.id = ?" : "s.slug = ?"}) AND ${PUBLISHED}`;
  const [rows] = await pool.query(
    `SELECT ${BASE_COLUMNS}, s.script, s.source_note AS sourceNote
     ${BASE_FROM} ${where}`,
    [byId ? Number(id) : id]
  );
  if (!rows.length) {
    return res.status(404).json({ error: "故事不存在或已下架" });
  }
  const story = rows[0];
  story.emotionTags = safeEmotionTags(story.emotionTags);

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

/** POST /api/stories/:id/report —— 提交内容纠错（游客可提交；带有效 JWT 自动关联用户）
 *  本阶段无频率限制（记录可事后清理），接入风控时复用 auth.js 的 60s 限频模式 */
router.post("/:id/report", async (req, res) => {
  const { content } = req.body || {};
  if (
    typeof content !== "string" ||
    content.trim().length < 5 ||
    content.trim().length > 500
  ) {
    return res.status(400).json({ error: "纠错内容需在5-500字之间" });
  }
  // 可选认证：令牌有效则记 user_id，无效/缺失按游客处理（表结构允许 user_id 为 NULL）
  let userId = null;
  const token = extractToken(req);
  if (token) {
    try {
      userId = Number(jwt.verify(token, config.jwtSecret).sub);
    } catch (_) {
      /* 无效令牌按游客 */
    }
  }
  const id = req.params.id;
  const byId = /^\d+$/.test(id); // 与 GET /:id 同规则：slug 或数字 ID
  // 注意：PUBLISHED 常量带 s. 别名前缀，查询必须 FROM stories s
  const [rows] = await pool.query(
    `SELECT s.id FROM stories s WHERE (${byId ? "s.id = ?" : "s.slug = ?"}) AND ${PUBLISHED}`,
    [byId ? Number(id) : id]
  );
  if (!rows.length) {
    return res.status(404).json({ error: "故事不存在或已下架" });
  }
  const [r] = await pool.query(
    "INSERT INTO story_reports (user_id, story_id, content) VALUES (?, ?, ?)",
    [userId, rows[0].id, content.trim()]
  );
  res.json({ ok: true, id: Number(r.insertId) });
});

module.exports = router;
