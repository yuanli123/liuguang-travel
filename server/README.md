# 流光幻旅 · 后端服务

Node.js + Express 5 + MySQL 8 的 REST API，为阶段二的真实登录、云端同步、AI 内容生产打地基。

## 目录结构

```
server/
├── package.json          依赖与 npm 脚本
├── .env.example          配置模板（复制成 .env 后填写）
├── .env                  本地配置（已被 .gitignore 排除，不会提交）
├── db/
│   ├── schema.sql        19 张表结构（可重复执行）
│   ├── init.js           建库 + 建表 + 灌种子（一条命令）
│   ├── seed.js           种子数据：12 篇故事 / 12 个点位 / 4 个主题
│   ├── extract-stories.js  开发工具：从 ../app.js 重新提取故事数据
│   └── stories.json      故事数据快照（提交入库，seed 只读它）
└── src/
    ├── config.js         读取 .env
    ├── db.js             MySQL 连接池
    ├── app.js            Express 装配（路由挂载点）
    ├── index.js          入口：npm start
    └── routes/           health / stories / cities
```

## 第 0 步 · 检查环境

```bash
node -v     # 需要 18 以上（本项目在 24 上开发）
```

## 第 1 步 · 安装 MySQL 8（Windows）

1. 打开 <https://dev.mysql.com/downloads/installer/>，下载第二个「Windows (x86, 32-bit), MSI Installer」（约 400MB）。
2. 运行安装器，Setup Type 选 **Developer Default**（想装小一点可选 **Server only**）。
3. 关键选项：
   - **Port 3306**，勾选「Open Windows Firewall port for network access」（不需要远程访问可不勾）
   - Authentication Method 选 **Use Strong Password Encryption**（默认，本项目原生支持，不要选旧式兼容）
   - 设置 root 密码，例如 `root123456`（本地开发够用；**生产环境必须用强密码**）
   - Windows Service 名保持 `MySQL80`，勾选开机自启
4. Apply / Execute 直到全部绿色完成。MySQL Workbench 可选装（可视化管理工具，装上看表方便）。
5. 验证：开始菜单搜索「MySQL 8.0 Command Line Client」，打开后输入密码，出现 `mysql>` 即成功。

> ⚠️ 如果安装时设的 root 密码不是 `root123456`，请同步修改 `server/.env` 里的 `DB_PASSWORD`。

## 第 2 步 · 配置 .env

```bash
copy .env.example .env    # 复制模板
```

用记事本/VSCode 打开 `.env`，确认 `DB_PASSWORD` 与第 1 步设置的密码一致。其余保持默认即可。

## 第 3 步 · 安装依赖

```bash
npm install
```

## 第 4 步 · 初始化数据库

```bash
npm run db:init
```

会自动完成：建库 `liuguang_travel` → 建 19 张表 → 写入 12 篇故事、12 个点位、4 个主题及关联。

**可重复执行**，不会产生重复数据（故事内容有更新时会被覆盖）。单独重灌种子：`npm run seed`。

## 第 5 步 · 启动与验证

```bash
npm run dev      # 开发模式（改代码自动重启）；或 npm start
```

另开一个终端验证：

```bash
curl http://localhost:3000/api/health
# {"status":"ok","db":"connected","time":"..."}

curl http://localhost:3000/api/stories
# {"stories":[...12 条已上架故事...],"total":12}

curl "http://localhost:3000/api/stories?city=北京"
# {"stories":[3 条北京故事],"total":3}

curl http://localhost:3000/api/stories/kunming
# 详情：含 script 正文、sourceNote 信源、points 点位坐标

curl http://localhost:3000/api/cities
# {"cities":[{"city":"北京","storyCount":3},...共 8 城]}
```

### 已有接口

| 接口 | 说明 |
|---|---|
| `GET /api/health` | 服务与数据库健康检查 |
| `GET /api/stories` | 已上架故事列表（含经纬度），可选 `?city=` 过滤 |
| `GET /api/stories/:id` | 故事详情（slug 或数字 ID），含正文/信源/点位 |
| `GET /api/cities` | 城市及故事数量（按数量降序） |
| `POST /api/auth/sms/send` | 发送登录验证码（开发期不接真实短信，验证码随响应 `devCode` 返回，60 秒限频） |
| `POST /api/auth/sms/verify` | 校验验证码并登录/注册，返回 JWT（30 天有效） |
| `GET /api/me` | 当前登录用户（需 `Authorization: Bearer <token>`） |
| `POST /api/sync` | 收藏/进度/完播/历史/行程云端合并同步（需登录） |
| `POST /api/stories/:id/report` | 提交内容纠错（游客可提交，5-500 字） |
| `GET /api/admin/reports` | 纠错列表，最新在前（需 `ADMIN_TOKEN`，可选 `?status=0/1/2`） |
| `POST /api/admin/reports/:id/resolve` | 处理纠错 `{status:1已采纳|2已驳回}`（需 `ADMIN_TOKEN`） |

错误统一返回中文 JSON：`{"error":"..."}`；未知接口返回 404 `{"error":"接口不存在"}`。

> **开发期登录说明**：短信发送接口会返回 `devCode`（并在服务端控制台打印），前端 App 会把验证码显示在 toast 里，输入即可登录。接入真实短信服务后（阶段二 B1），`devCode` 在生产环境（`NODE_ENV=production`）自动不下发。

### 内容纠错

```bash
# 游客提交纠错（无需登录）
curl -X POST http://localhost:3000/api/stories/kunming/report \
  -H "Content-Type: application/json" \
  -d '{"content":"十七孔桥的金光穿洞实际出现在冬至前后"}'

# 管理员查看待处理纠错（把 <admin> 换成 .env 里的 ADMIN_TOKEN）
curl http://localhost:3000/api/admin/reports?status=0 \
  -H "Authorization: Bearer <admin>"

# 采纳（1）或驳回（2）某条纠错
curl -X POST http://localhost:3000/api/admin/reports/1/resolve \
  -H "Authorization: Bearer <admin>" \
  -H "Content-Type: application/json" \
  -d '{"status":1}'
```

> 已知限制：纠错提交暂无频率限制（游客可重复提交，属本阶段接受的 MVP 简化）；后台处理人字段（resolved_by）暂不记录。

## 故事数据更新

`../app.js` 里的 `STORIES` 数组是故事数据的源头。改动后运行：

```bash
npm run extract-stories   # 重新提取 → db/stories.json
npm run db:init           # 或 npm run seed，写入数据库
```

## 常见问题

| 现象 | 解决 |
|---|---|
| `Access denied for user 'root'` | `.env` 里 `DB_PASSWORD` 与安装时设的密码不一致 |
| `connect ECONNREFUSED 127.0.0.1:3306` | MySQL 服务没启动：管理员命令行运行 `net start MySQL80` |
| 端口 3306 被占用 | `.env` 改 `DB_PORT`（如 XAMPP 自带 MySQL 已占用） |
| API 端口 3000 被占用 | `.env` 改 `PORT=3001` |
| 中文乱码 | 连接已强制 utf8mb4；Workbench 查看时连接编码选 utf8mb4 |
| 前端请求被 CORS 拦截 | 前端地址需在 `.env` 的 `CORS_ORIGIN` 列表中（逗号分隔） |
