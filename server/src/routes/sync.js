/**
 * 云端同步：
 *   POST /api/sync（需登录）
 *
 * 合并语义（单事务）：
 *   收藏   = 先删 favoritesRemoved，再 INSERT IGNORE 并集
 *   进度   = GREATEST 秒数取胜；完播 = OR（一旦完播不回退）
 *   历史   = 按 (user, story) 去重，只插新对；仅新对 play_count + 1
 *   行程   = 用户单行程「我的行程」+ trip_items INSERT IGNORE
 * 响应回读合并后的完整状态；未知 slug 放入 ignored 由前端本地保留。
 */
const express = require("express");
const pool = require("../db");
const { authRequired } = require("../middleware/auth");

const router = express.Router();

/** slug → story_id 映射；未知 slug 收集进 ignored */
async function slugToIdMap(conn, slugs) {
  const map = {};
  const ignored = [];
  if (!slugs || !slugs.length) return { map, ignored };
  const [rows] = await conn.query(
    "SELECT id, slug FROM stories WHERE slug IN (?) AND deleted_at IS NULL",
    [slugs]
  );
  for (const r of rows) map[r.slug] = r.id;
  for (const s of slugs) if (!(s in map)) ignored.push(s);
  return { map, ignored };
}

const asStrList = (v) =>
  Array.isArray(v) ? [...new Set(v.filter((x) => typeof x === "string"))] : [];

router.post("/", authRequired, async (req, res) => {
  const b = req.body || {};
  const uid = req.user.id;
  const favs = asStrList(b.favorites);
  const favsRemoved = asStrList(b.favoritesRemoved);
  const completed = asStrList(b.completed);
  const history = asStrList(b.history);
  const trip = asStrList(b.trip);
  const progress =
    b.progress && typeof b.progress === "object" && !Array.isArray(b.progress)
      ? b.progress
      : {};
  const rate = Math.min(2, Math.max(0.5, Number(b.rate) || 1));

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const ignored = new Set();
    const allSlugs = [...new Set([...favs, ...favsRemoved, ...completed, ...history, ...trip])];
    const { map, ignored: ig } = await slugToIdMap(conn, allSlugs);
    ig.forEach((x) => ignored.add(x));

    // —— 收藏：先删后并 ——
    if (favsRemoved.length) {
      const rmIds = favsRemoved.map((s) => map[s]).filter(Boolean);
      if (rmIds.length) {
        await conn.query("DELETE FROM favorites WHERE user_id = ? AND story_id IN (?)", [
          uid,
          rmIds,
        ]);
      }
    }
    const favRows = favs.map((s) => [uid, map[s]]).filter((r) => r[1]);
    if (favRows.length) {
      await conn.query("INSERT IGNORE INTO favorites (user_id, story_id) VALUES ?", [favRows]);
    }

    // —— 进度：逐行 GREATEST + 完播 OR + 倍速 ——
    for (const slug of Object.keys(progress)) {
      const sid = map[slug];
      if (!sid) continue;
      const sec = Math.max(0, Math.round(Number(progress[slug]) || 0));
      const done = completed.includes(slug) ? 1 : 0;
      await conn.query(
        `INSERT INTO play_progress (user_id, story_id, progress_sec, completed, speed)
         VALUES (?, ?, ?, ?, ?) AS new
         ON DUPLICATE KEY UPDATE
           progress_sec = GREATEST(play_progress.progress_sec, new.progress_sec),
           completed = play_progress.completed OR new.completed,
           speed = new.speed`,
        [uid, sid, sec, done, rate]
      );
    }
    // —— 完播清单单独落库（可能没有进度记录） ——
    for (const slug of completed) {
      const sid = map[slug];
      if (!sid) continue;
      await conn.query(
        `INSERT INTO play_progress (user_id, story_id, progress_sec, completed, speed)
         VALUES (?, ?, 0, 1, ?) AS new
         ON DUPLICATE KEY UPDATE completed = play_progress.completed OR new.completed`,
        [uid, sid, rate]
      );
    }

    // —— 历史：SELECT 去重 → 只插新对 → 新对才加 play_count ——
    const histRows = history
      .map((s) => [
        uid,
        map[s],
        Math.max(0, Math.round(Number(progress[s]) || 0)),
        completed.includes(s) ? 1 : 0,
      ])
      .filter((r) => r[1]);
    const newHist = [];
    if (histRows.length) {
      const [existing] = await conn.query(
        "SELECT DISTINCT story_id FROM play_history WHERE user_id = ? AND story_id IN (?)",
        [uid, histRows.map((r) => r[1])]
      );
      const have = new Set(existing.map((e) => e.story_id));
      for (const r of histRows) if (!have.has(r[1])) newHist.push(r);
      if (newHist.length) {
        await conn.query(
          "INSERT INTO play_history (user_id, story_id, listened_sec, completed) VALUES ?",
          [newHist]
        );
        await conn.query("UPDATE stories SET play_count = play_count + 1 WHERE id IN (?)", [
          newHist.map((r) => r[1]),
        ]);
      }
    }

    // —— 行程：单行程「我的行程」+ INSERT IGNORE ——
    const tripRows = trip.map((s) => [uid, map[s]]).filter((r) => r[1]);
    if (tripRows.length) {
      let [[tr]] = await conn.query("SELECT id FROM trips WHERE user_id = ? ORDER BY id LIMIT 1", [
        uid,
      ]);
      if (!tr) {
        const [ins] = await conn.query("INSERT INTO trips (user_id, name) VALUES (?, '我的行程')", [
          uid,
        ]);
        tr = { id: ins.insertId };
      }
      await conn.query("INSERT IGNORE INTO trip_items (trip_id, story_id) VALUES ?", [
        tripRows.map(([, sid]) => [tr.id, sid]),
      ]);
    }

    await conn.commit();

    // —— 回读合并态 ——
    const [favCloudRows] = await conn.query(
      `SELECT s.slug FROM favorites f JOIN stories s ON s.id = f.story_id
        WHERE f.user_id = ? ORDER BY f.created_at DESC`,
      [uid]
    );
    const [progRows] = await conn.query(
      "SELECT s.slug, pp.progress_sec, pp.completed FROM play_progress pp JOIN stories s ON s.id = pp.story_id WHERE pp.user_id = ?",
      [uid]
    );
    const [histAgg] = await conn.query(
      `SELECT s.slug FROM play_history ph JOIN stories s ON s.id = ph.story_id
        WHERE ph.user_id = ? GROUP BY s.slug ORDER BY MAX(ph.played_at) DESC LIMIT 50`,
      [uid]
    );
    const [[tripAgg]] = await conn.query(
      `SELECT t.id AS tripId FROM trips t WHERE t.user_id = ? ORDER BY t.id LIMIT 1`,
      [uid]
    );
    let tripSlugs = [];
    if (tripAgg) {
      const [rows] = await conn.query(
        `SELECT s.slug FROM trip_items ti JOIN stories s ON s.id = ti.story_id
          WHERE ti.trip_id = ? ORDER BY ti.added_at ASC`,
        [tripAgg.tripId]
      );
      tripSlugs = rows.map((r) => r.slug);
    }

    const mergedProgress = {};
    const mergedCompleted = [];
    for (const p of progRows) {
      mergedProgress[p.slug] = p.progress_sec;
      if (p.completed) mergedCompleted.push(p.slug);
    }

    res.json({
      syncedAt: new Date().toISOString(),
      favorites: favCloudRows.map((r) => r.slug),
      progress: mergedProgress,
      completed: mergedCompleted,
      history: histAgg.map((r) => r.slug),
      trip: tripSlugs,
      ignored: [...ignored],
    });
  } catch (e) {
    await conn.rollback();
    throw e; // Express 5 自动送 500
  } finally {
    conn.release();
  }
});

module.exports = router;
