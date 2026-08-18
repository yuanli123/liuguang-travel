/**
 * 账号与访问：
 *   POST /api/auth/sms/send     发送验证码（开发期不接真实短信，验证码随响应返回）
 *   POST /api/auth/sms/verify   校验验证码，登录/注册，签发 JWT
 *   GET  /api/me                （处理器导出，由 app.js 挂载）当前用户信息
 */
const express = require("express");
const jwt = require("jsonwebtoken");
const pool = require("../db");
const config = require("../config");
const { authRequired } = require("../middleware/auth");

const router = express.Router();

const maskPhone = (p) => (p || "").slice(0, 3) + "****" + (p || "").slice(-4);
const isValidPhone = (p) => /^1\d{10}$/.test(String(p || ""));

// POST /api/auth/sms/send
router.post("/sms/send", async (req, res) => {
  const { phone } = req.body || {};
  if (!isValidPhone(phone)) {
    return res.status(400).json({ error: "手机号格式不正确" });
  }
  // 60 秒限频（开发期同样生效，保持演示真实）
  const [recent] = await pool.query(
    "SELECT id FROM sms_codes WHERE phone = ? AND created_at > (NOW() - INTERVAL 60 SECOND) LIMIT 1",
    [phone]
  );
  if (recent.length) {
    return res.status(429).json({ error: "发送太频繁，请稍后再试" });
  }
  const code = String(Math.floor(100000 + Math.random() * 900000));
  // 作废旧未用码，再写入新码（5 分钟有效）
  await pool.query("UPDATE sms_codes SET used = 1 WHERE phone = ? AND used = 0", [phone]);
  await pool.query(
    "INSERT INTO sms_codes (phone, code, expires_at) VALUES (?, ?, NOW() + INTERVAL 5 MINUTE)",
    [phone, code]
  );
  console.log(`[演示短信] ${phone} 验证码 ${code}（5 分钟内有效）`);
  res.json({
    devCode: config.nodeEnv === "production" ? undefined : code,
    expiresIn: 300,
  });
});

// POST /api/auth/sms/verify
router.post("/sms/verify", async (req, res) => {
  const { phone, code } = req.body || {};
  if (!isValidPhone(phone) || !/^\d{6}$/.test(String(code || ""))) {
    return res.status(400).json({ error: "手机号或验证码格式不正确" });
  }
  const [rows] = await pool.query(
    "SELECT id FROM sms_codes WHERE phone = ? AND code = ? AND used = 0 AND expires_at > NOW() ORDER BY id DESC LIMIT 1",
    [phone, String(code)]
  );
  if (!rows.length) {
    return res.status(400).json({ error: "验证码错误或已过期" });
  }
  await pool.query("UPDATE sms_codes SET used = 1 WHERE id = ?", [rows[0].id]);

  const nickname = "旅人" + String(phone).slice(-4);
  // 已存在用户时，id = LAST_INSERT_ID(id) 让 insertId 返回已存在行 id，updated_at 兼作最近登录时间
  const [r] = await pool.query(
    "INSERT INTO users (phone, nickname) VALUES (?, ?) ON DUPLICATE KEY UPDATE id = LAST_INSERT_ID(id)",
    [phone, nickname]
  );
  const userId = Number(r.insertId);
  const token = jwt.sign({ sub: String(userId), type: "phone" }, config.jwtSecret, {
    expiresIn: "30d",
  });
  res.json({
    token,
    user: {
      type: "phone",
      nickname,
      phoneMasked: maskPhone(phone),
      userId,
      loginAt: Date.now(),
    },
  });
});

// GET /api/me 处理器（由 app.js 挂载）
async function meHandler(req, res) {
  const [[u]] = await pool.query(
    "SELECT id, phone, nickname, avatar_url FROM users WHERE id = ?",
    [req.user.id]
  );
  if (!u) return res.status(401).json({ error: "账号不存在" });
  res.json({
    user: {
      type: "phone",
      nickname: u.nickname,
      phoneMasked: maskPhone(u.phone),
      userId: u.id,
    },
  });
}

module.exports = router;
module.exports.me = [authRequired, meHandler];
