/** GET /api/health —— 服务与数据库健康检查 */
const express = require("express");
const pool = require("../db");

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    await pool.query("SELECT 1");
    res.json({ status: "ok", db: "connected", time: new Date().toISOString() });
  } catch {
    res.status(500).json({ error: "数据库连接失败，请检查 MySQL 服务是否已启动" });
  }
});

module.exports = router;
