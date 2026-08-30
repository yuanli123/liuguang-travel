/**
 * 全局配置：从 server/.env 读取（dotenv 用绝对路径定位，与启动目录无关）
 */
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env"), quiet: true });

module.exports = {
  db: {
    host: process.env.DB_HOST || "127.0.0.1",
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || "root",
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME || "liuguang_travel",
  },
  port: Number(process.env.PORT || 3000),
  jwtSecret: process.env.JWT_SECRET || "liuguang-dev-secret-change-me",
  nodeEnv: process.env.NODE_ENV || "development",
  adminToken: process.env.ADMIN_TOKEN || "",
  // AI 故事工坊（DeepSeek，OpenAI 兼容接口）；未配置 key 时生成接口返回 503
  ai: {
    apiKey: process.env.DEEPSEEK_API_KEY || "",
    apiBase: process.env.DEEPSEEK_API_BASE || "https://api.deepseek.com",
    model: process.env.DEEPSEEK_MODEL || "deepseek-chat",
  },
  corsOrigins: (process.env.CORS_ORIGIN || "http://localhost:8123,http://127.0.0.1:8123")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean),
};
