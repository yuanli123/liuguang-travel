/**
 * 服务入口：npm start / npm run dev（dev 带自动重启）
 */
const app = require("./app");
const config = require("./config");
const pool = require("./db");

const server = app.listen(config.port, () => {
  console.log(
    `流光幻旅 API 已启动：http://localhost:${config.port}（/api/health 检查健康）`
  );
});

// Ctrl+C 优雅退出：先关 HTTP，再释放数据库连接池
process.on("SIGINT", async () => {
  server.close();
  await pool.end();
  process.exit(0);
});
