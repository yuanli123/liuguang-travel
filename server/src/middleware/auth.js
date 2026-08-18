/**
 * JWT 认证中间件
 * - 优先读 Authorization: Bearer <token>
 * - 兜底读请求体里的 token（冗余保障，keepalive fetch 实际支持 header）
 */
const jwt = require("jsonwebtoken");
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

module.exports = { authRequired, extractToken };
