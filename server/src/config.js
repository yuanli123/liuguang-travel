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
  // 按需生成（拍景点·现场听故事）：各 key 未配置时对应环节降级（spec §5）
  baidu: {
    landmarkKey: process.env.BAIDU_LANDMARK_KEY || "",
    landmarkSecret: process.env.BAIDU_LANDMARK_SECRET || "",
  },
  vision: {
    apiKey: process.env.VISION_API_KEY || "",
    // 默认智谱 GLM-4V-Flash（免费档，OpenAI 兼容）；可切换 Qwen-VL 等其他 OpenAI 兼容视觉模型
    apiBase: process.env.VISION_API_BASE || "https://open.bigmodel.cn/api/paas/v4",
    model: process.env.VISION_MODEL || "glm-4v-flash",
  },
  bocha: {
    apiKey: process.env.BOCHA_API_KEY || "",
  },
  amap: {
    // 复用前端定位的 AMap key；周边搜索需控制台开通「Web 服务」类型
    webKey: process.env.AMAP_KEY || process.env.AMAP_WEB_KEY || "",
  },
  corsOrigins: (process.env.CORS_ORIGIN || "http://localhost:8123,http://127.0.0.1:8123")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean),
};
