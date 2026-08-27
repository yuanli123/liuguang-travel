/**
 * 内容纠错后台（最小 MVP，无管理后台 UI，用 curl/API 调用）：
 *   GET  /api/admin/reports              纠错列表（?status=0/1/2 可选，最新在前）
 *   POST /api/admin/reports/:id/resolve  处理纠错 {status: 1已采纳|2已驳回}
 *
 * 鉴权：Bearer 令牌必须等于 .env 的 ADMIN_TOKEN（常数时间比较；未配置时一律拒绝）。
 * 说明：resolved_by 保持 NULL——数据库尚无管理员角色概念，schema 也没有 resolved_at
 * 字段，CMS 阶段再补完整处理留痕。
 */
const express = require("express");
const pool = require("../db");
const { adminRequired } = require("../middleware/auth");

const router = express.Router();

router.use(adminRequired);

// GET /api/admin/reports
router.get("/reports", async (req, res) => {
  const { status } = req.query;
  const cond = [];
  const params = [];
  if (status !== undefined) {
    const st = Number(status);
    if (![0, 1, 2].includes(st)) {
      return res.status(400).json({ error: "状态参数不正确" });
    }
    cond.push("r.status = ?");
    params.push(st);
  }
  const where = cond.length ? "WHERE " + cond.join(" AND ") : "";
  const [rows] = await pool.query(
    `SELECT r.id, r.story_id AS storyId, s.slug, s.title, r.content, r.status,
            r.user_id AS userId, u.nickname AS reporterNickname, r.created_at AS createdAt
       FROM story_reports r
       JOIN stories s ON s.id = r.story_id
       LEFT JOIN users u ON u.id = r.user_id
       ${where}
      ORDER BY r.id DESC`,
    params
  );
  res.json({ reports: rows, total: rows.length });
});

// POST /api/admin/reports/:id/resolve
router.post("/reports/:id/resolve", async (req, res) => {
  const rid = Number(req.params.id);
  if (!Number.isInteger(rid) || rid <= 0) {
    return res.status(400).json({ error: "参数不正确" });
  }
  const status = Number((req.body || {}).status);
  if (![1, 2].includes(status)) {
    return res.status(400).json({ error: "status 须为 1（已采纳）或 2（已驳回）" });
  }
  const [[row]] = await pool.query("SELECT id, status FROM story_reports WHERE id = ?", [rid]);
  if (!row) return res.status(404).json({ error: "纠错记录不存在" });
  if (row.status !== 0) return res.status(400).json({ error: "该纠错已处理" });
  await pool.query("UPDATE story_reports SET status = ? WHERE id = ?", [status, rid]);
  res.json({ ok: true });
});

module.exports = router;
