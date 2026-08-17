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
  corsOrigins: (process.env.CORS_ORIGIN || "http://localhost:8123,http://127.0.0.1:8123")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean),
};
