/**
 * 统计看板接口（E2，配合根目录 stats.html 使用）：
 *   GET /api/admin/stats/overview          总览指标
 *   GET /api/admin/stats/trend?days=7      近 N 日趋势（新增用户/播放/收藏/纠错）
 *   GET /api/admin/stats/stories?limit=20  故事热度榜（播放/收藏/完播率/收听时长等）
 *
 * 数据口径说明：play_history 每 (user,story) 仅 1 条（首次播放），
 * 完播率 = SUM(completed)/COUNT(*)，停留时长 = SUM(listened_sec)。
 * story_stats_daily 暂无聚合任务写入，本接口全部从事件表现算。
 * 鉴权与 /api/admin/* 一致：Bearer 必须等于 ADMIN_TOKEN。
 */
const express = require("express");
const pool = require("../db");
const { adminRequired } = require("../middleware/auth");

const router = express.Router();

router.use(adminRequired);

// GET /api/admin/stats/overview
router.get("/overview", async (req, res) => {
  const [[usersRow]] = await pool.query("SELECT COUNT(*) AS cnt FROM users");
  const [[storiesRow]] = await pool.query("SELECT COUNT(*) AS cnt FROM stories WHERE deleted_at IS NULL");
  const [[publishedRow]] = await pool.query(
    "SELECT COUNT(*) AS cnt FROM stories WHERE status = 2 AND deleted_at IS NULL"
  );
  const [[playsRow]] = await pool.query(
    "SELECT COALESCE(SUM(play_count), 0) AS plays FROM stories WHERE deleted_at IS NULL"
  );
  const [[histRow]] = await pool.query(
    "SELECT COUNT(*) AS cnt, COALESCE(SUM(completed), 0) AS completes, COALESCE(SUM(listened_sec), 0) AS secs FROM play_history"
  );
  const [[favRow]] = await pool.query("SELECT COUNT(*) AS cnt FROM favorites");
  const [[tripsRow]] = await pool.query("SELECT COUNT(*) AS cnt FROM trips");
  const [[tripItemsRow]] = await pool.query("SELECT COUNT(*) AS cnt FROM trip_items");
  const [reportRows] = await pool.query(
    "SELECT status, COUNT(*) AS cnt FROM story_reports GROUP BY status"
  );
  const [[cityRow]] = await pool.query(
    "SELECT COUNT(DISTINCT city) AS cnt FROM stories WHERE deleted_at IS NULL AND city <> ''"
  );

  const reports = { pending: 0, accepted: 0, rejected: 0 };
  for (const r of reportRows) {
    if (r.status === 0) reports.pending = Number(r.cnt);
    else if (r.status === 1) reports.accepted = Number(r.cnt);
    else if (r.status === 2) reports.rejected = Number(r.cnt);
  }
  const histCnt = Number(histRow.cnt);

  res.json({
    users: Number(usersRow.cnt),
    stories: Number(storiesRow.cnt),
    published: Number(publishedRow.cnt),
    plays: Number(playsRow.plays),
    playEvents: histCnt,
    completes: Number(histRow.completes),
    completeRate: histCnt ? Math.round((Number(histRow.completes) / histCnt) * 1000) / 10 : 0,
    totalListenSec: Number(histRow.secs),
    favorites: Number(favRow.cnt),
    trips: Number(tripsRow.cnt),
    tripItems: Number(tripItemsRow.cnt),
    reports,
    cities: Number(cityRow.cnt),
  });
});

// GET /api/admin/stats/trend?days=7
router.get("/trend", async (req, res) => {
  let days = 7;
  if (req.query.days !== undefined) {
    days = Number(req.query.days);
    if (!Number.isInteger(days) || days < 1 || days > 30) {
      return res.status(400).json({ error: "days 须为 1-30 的整数" });
    }
  }

  // 生成近 N 天的日期列表（本地时区），用 DATE_FORMAT 避免 mysql2 Date 序列化的时区偏移
  const dayList = [];
  const now = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
    dayList.push(
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
    );
  }
  const series = dayList.map((date) => ({
    date,
    newUsers: 0,
    playEvents: 0,
    favorites: 0,
    reports: 0,
  }));
  const byDate = new Map(series.map((s) => [s.date, s]));

  const QUERIES = [
    { table: "users", col: "created_at", key: "newUsers" },
    { table: "play_history", col: "played_at", key: "playEvents" },
    { table: "favorites", col: "created_at", key: "favorites" },
    { table: "story_reports", col: "created_at", key: "reports" },
  ];
  for (const q of QUERIES) {
    const [rows] = await pool.query(
      `SELECT DATE_FORMAT(${q.col}, '%Y-%m-%d') AS d, COUNT(*) AS c
         FROM ${q.table}
        WHERE ${q.col} >= NOW() - INTERVAL ? DAY
        GROUP BY d`,
      [days]
    );
    for (const r of rows) {
      const s = byDate.get(r.d);
      if (s) s[q.key] = Number(r.c);
    }
  }
  res.json({ days: series });
});

// GET /api/admin/stats/stories?limit=20
router.get("/stories", async (req, res) => {
  let limit = 20;
  if (req.query.limit !== undefined) {
    limit = Number(req.query.limit);
    if (!Number.isInteger(limit) || limit < 1 || limit > 50) {
      return res.status(400).json({ error: "limit 须为 1-50 的整数" });
    }
  }

  const [rows] = await pool.query(
    `SELECT s.slug, s.title, s.city, s.play_count AS playCount,
            (SELECT COUNT(*) FROM favorites f WHERE f.story_id = s.id) AS favCount,
            (SELECT COUNT(*) FROM play_history h WHERE h.story_id = s.id) AS playEvents,
            (SELECT COALESCE(SUM(h.completed), 0) FROM play_history h WHERE h.story_id = s.id) AS completedCount,
            (SELECT COALESCE(SUM(h.listened_sec), 0) FROM play_history h WHERE h.story_id = s.id) AS listenSec,
            (SELECT COUNT(*) FROM story_reports r WHERE r.story_id = s.id) AS reportCount,
            (SELECT COUNT(*) FROM trip_items t WHERE t.story_id = s.id) AS tripCount
       FROM stories s
      WHERE s.deleted_at IS NULL
      ORDER BY s.play_count DESC, s.id ASC
      LIMIT ?`,
    [limit]
  );

  const stories = rows.map((r) => {
    const pe = Number(r.playEvents);
    return {
      ...r,
      playCount: Number(r.playCount),
      favCount: Number(r.favCount),
      playEvents: pe,
      completedCount: Number(r.completedCount),
      completeRate: pe ? Math.round((Number(r.completedCount) / pe) * 1000) / 10 : 0,
      listenSec: Number(r.listenSec),
      reportCount: Number(r.reportCount),
      tripCount: Number(r.tripCount),
    };
  });
  res.json({ stories, total: stories.length });
});

module.exports = router;
