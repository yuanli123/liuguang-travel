# 「拍景点·现场听故事」实施计划

对应设计文档：`docs/superpowers/specs/2026-10-18-on-demand-photo-story-design.md`
状态：Phase 1-4 已完成（后端+前端+降级矩阵+浏览器端到端验证）；Phase 0（key 申请）与 Phase 5（真实 key 端到端）待需求方办理后进行

## Phase 0 · 前置准备（需求方办理，可并行）

| # | 事项 | 产出 |
|---|---|---|
| 0.1 | 百度智能云实名认证，开通图像识别「地标识别」，取 API Key/Secret Key | `BAIDU_LANDMARK_KEY/SECRET` |
| 0.2 | 智谱开放平台注册，取 GLM-4V-Flash（免费档）key | `VISION_API_KEY` |
| 0.3 | 博查 AI 搜索注册，取 key | `BOCHA_API_KEY` |
| 0.4 | 高德控制台确认现有 key 已开通「Web 服务」（周边搜索用）；未开通则补开 | — |

未配置的 key 不阻断开发：所有环节都有降级路径（spec §5），先用降级路径开发与自测，拿到 key 后做端到端验证。

## Phase 1 · 后端配置与封装

1.1 `server/src/config.js` 新增配置段：`baidu`（landmarkKey/landmarkSecret）、`vision`（apiKey/apiBase/model，默认 GLM-4V-Flash）、`bocha`（apiKey）。
1.2 新增 `server/src/lib/websearch.js`：`bochaAiSearch(query)` → 速览 `{summary, sources}`；`bochaWebSearch(query)` → 素材文本。超时/无 key/失败一律返回 null（降级）。
1.3 新增 `server/src/lib/vision.js`：`baiduLandmark(image)` → 景点名或 null（access_token 用 key+secret 换取，进程内缓存至过期前 5 分钟）；`visionIdentify(image, candidates, lat, lng)` → `{name, confidence}` 或 null（OpenAI 兼容接口，prompt 要求结合候选 POI 与定位识别牌匾文字/建筑特征，输出 JSON）。
1.4 小重构：`ai.js` 的 `SYSTEM_PROMPT`/`normalizeStory` 提为 `lib/ai-generate.js` 导出（`STORY_SYSTEM_PROMPT`、`normalizeStory`），`ai.js` 改为引用——on-demand 复用同一口径，无行为变化。

**验证**：`node -e` 分别调用三个封装（无 key 时返回 null 不抛错）。

## Phase 2 · 流水线路由

2.1 新增 `server/src/routes/on-demand.js`：
- `POST /recognize`：校验 lat/lng 或 name → 有照片则走识别链（高德周边 POI → 地标识别 → 视觉兜底 → 低置信返回 candidates）→ 发起 job（速览先行、写稿配音后台）→ 立即返回 `{jobId, spot, candidates?, fast}`；短缓存 `Map<spotKey, jobId>`（当日内存级）命中直接复用；
- 高德周边搜索：新增 `lib/amap.js`（Web 服务 `/v3/place/around`，复用现有 AMap key，fetch + AbortSignal.timeout 范式）；
- job：内存 `Map<jobId, {stage, story, audioUrl, error}>`，90s 总超时；
- `GET /:jobId`：返回 stage/成品；未找到 404；
- 每步 `ai_tasks` 留痕（type='on-demand'），照片不落盘。
2.2 `server/src/index.js` 挂载路由。
2.3 写稿复用 `callDeepseek` + `STORY_SYSTEM_PROMPT`（仅 chat 模式）；配音复用 `MsEdgeTTS` + `modes.js` chat 音色（输出到 `server/audio/ondemand/` 临时目录，播放后不清理亦可，量小）。

**验证**：`curl` 无 key 场景（名称直达路径）：速览为 null、故事仍生成（DeepSeek 需要 key；无 key 时返回 failed + 清晰报错）；jobId 轮询 404。

## Phase 3 · 后端降级矩阵验证

按 spec §5 逐条 curl：无定位、无照片仅名称、各 key 未配置、配音失败不阻塞、超时、404。

## Phase 4 · 前端 UI

4.1 `index.html`：地图悬浮按钮「📷」；拍摄面板 overlay（相机 input `capture="environment"` + 名称输入 + 候选 POI 点选列表 + 步骤条 + 速览卡）；搜索空态卡片（地图搜索 + Feed 搜索两处）。
4.2 `app.js`：
- 悬浮按钮/搜索空态 → 打开面板；定位复用 `requestUserLocation()`；
- 提交 → `POST /api/on-demand/recognize` → 速览先展示（含「AI 生成·未经核查」标注与来源链接）→ 2s 轮询驱动步骤条 → 低置信展示候选 POI 点选/手动输入 → done 自动打开播放器；
- `openPlayer` 增加 on-demand 分支：单模式（隐藏模式行）、未核查角标、禁用收藏/加入行程；
- jobId 404 → 提示重新拍摄。
4.3 `styles.css`：悬浮按钮、面板、步骤条、速览卡样式（沿用现有设计语言）。

**验证**：headless 浏览器驱动（沿用上次行程测试的 playwright-core 方法）：无 key 降级全流程 UI、搜索空态卡片、播放页角标与隐藏模式行。

## Phase 5 · 端到端联调（拿到 key 后）

5.1 真实拍摄/上传著名景点照片：识别 → 速览 → 故事 → 配音 → 播放全流程；5.2 长尾景点视觉兜底与 POI 点选路径；5.3 短缓存二次请求验证（ai_tasks 留痕无新增调用）；5.4 成本核算对照 spec §7.1。

## 改动文件清单

| 文件 | Phase |
|---|---|
| `server/src/config.js` | 1 |
| `server/src/lib/websearch.js`（新） | 1 |
| `server/src/lib/vision.js`（新） | 1 |
| `server/src/lib/ai-generate.js`（提 SYSTEM_PROMPT/normalizeStory） | 1 |
| `server/src/routes/ai.js`（改引用） | 1 |
| `server/src/lib/amap.js`（新） | 2 |
| `server/src/routes/on-demand.js`（新） | 2 |
| `server/src/index.js` | 2 |
| `app.js` / `index.html` / `styles.css` | 4 |
