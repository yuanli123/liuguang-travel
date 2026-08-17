/** GET /api/cities —— 城市列表及已上架故事数（按数量降序） */
const express = require("express");
const pool = require("../db");

const router = express.Router();

router.get("/", async (req, res) => {
  const [rows] = await pool.query(
    `SELECT city, COUNT(*) AS storyCount
       FROM stories
      WHERE status = 2 AND deleted_at IS NULL
      GROUP BY city
      ORDER BY storyCount DESC, city ASC`
  );
  res.json({
    cities: rows.map((r) => ({ city: r.city, storyCount: Number(r.storyCount) })),
  });
});

module.exports = router;
