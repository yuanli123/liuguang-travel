/**
 * JWT 认证中间件
 * - 优先读 Authorization: Bearer <token>
 * - 兜底读请求体里的 token（冗余保障，keepalive fetch 实际支持 header）
 */
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const config = require("../config");

function extractToken(req) {
  const m = (req.headers.authorization || "").match(/^Bearer\s+(.+)$/i);
  if (m) return m[1];
  if (req.body && typeof req.body.token === "string" && req.body.token) {
    return req.body.token;
  }
  return null;
}

function authRequired(req, res, next) {
  const token = extractToken(req);
  if (!token) return res.status(401).json({ error: "未登录" });
  try {
    const payload = jwt.verify(token, config.jwtSecret);
    req.user = { id: Number(payload.sub), type: payload.type };
    next();
  } catch {
    res.status(401).json({ error: "登录已过期，请重新登录" });
  }
}

/** 管理端鉴权：Bearer 令牌必须等于 .env 的 ADMIN_TOKEN（常数时间比较；未配置一律拒绝） */
function adminRequired(req, res, next) {
  const token = extractToken(req);
  if (!token || !config.adminToken) {
    return res.status(401).json({ error: "未授权" });
  }
  const a = Buffer.from(String(token));
  const b = Buffer.from(config.adminToken);
  // timingSafeEqual 对长度不等的输入会抛异常，必须先比长度
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    return res.status(401).json({ error: "未授权" });
  }
  next();
}

module.exports = { authRequired, extractToken, adminRequired };
