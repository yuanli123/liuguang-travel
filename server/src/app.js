/**
 * Express 应用装配（与 index.js 分离，方便后续测试直接 import 不监听端口）
 *
 * 后续阶段新增路由（auth/sync/favorites 等）时，在下方加一行挂载即可。
 */
const express = require("express");
const cors = require("cors");
const config = require("./config");

const app = express();

app.use(express.json()); // 本阶段尚无 POST，为后续 auth/sync 预留

app.use(
  cors({
    origin: (origin, cb) => {
      // curl 无 Origin；file:// 直开前端时 Origin 为 "null" —— 开发期放行
      if (!origin || origin === "null" || config.corsOrigins.includes(origin)) {
        return cb(null, true);
      }
      return cb(null, false); // 拒绝时不抛错，浏览器侧静默阻止
    },
  })
);

// 根路径：接口导航（浏览器直接访问时不再困惑）
app.get("/", (req, res) => {
  res.json({
    name: "流光幻旅 API",
    message: "后端服务运行中，请访问以下接口：",
    endpoints: [
      "GET /api/health            健康检查",
      "GET /api/stories           已上架故事列表（可加 ?city=北京 过滤）",
      "GET /api/stories/:id       故事详情（如 /api/stories/kunming）",
      "GET /api/cities            城市及故事数量",
      "POST /api/auth/sms/send    发送登录验证码（开发期随响应返回）",
      "POST /api/auth/sms/verify  校验验证码并登录（返回 JWT）",
      "GET /api/me                当前登录用户",
      "POST /api/sync             收藏/进度/历史/行程 云端合并同步",
      "POST /api/stories/:id/report  提交内容纠错（游客可提交，5-500字）",
      "GET /api/admin/reports        纠错列表（需 ADMIN_TOKEN，?status=0/1/2）",
      "POST /api/admin/reports/:id/resolve  处理纠错（需 ADMIN_TOKEN）",
      "GET /api/admin/stats/overview  统计看板总览（需 ADMIN_TOKEN）",
      "GET /api/admin/stats/trend     近N日趋势（?days=7，需 ADMIN_TOKEN）",
      "GET /api/admin/stats/stories   故事热度榜（?limit=20，需 ADMIN_TOKEN）",
      "GET /api/geo/ip              IP→城市（定位权限被拒时的兜底）",
    ],
  });
});

// 路由挂载
app.use("/api/health", require("./routes/health"));
app.use("/api/stories", require("./routes/stories"));
app.use("/api/cities", require("./routes/cities"));
const auth = require("./routes/auth");
app.use("/api/auth", auth);
app.get("/api/me", auth.me);
app.use("/api/sync", require("./routes/sync"));
// 注意：/api/admin/stats 必须挂载在 /api/admin 之前（Express 按挂载顺序做前缀匹配）
app.use("/api/admin/stats", require("./routes/admin-stats"));
app.use("/api/admin", require("./routes/admin"));
app.use("/api/geo", require("./routes/geo"));

// 404 兜底（统一中文 JSON）
app.use((req, res) => {
  res.status(404).json({ error: "接口不存在" });
});

// 错误兜底（Express 5 会把 async 路由的 reject 自动送到这里）
app.use((err, req, res, next) => {
  console.error("[API错误]", err);
  res.status(500).json({ error: "服务器开小差了，请稍后再试" });
});

module.exports = app;
