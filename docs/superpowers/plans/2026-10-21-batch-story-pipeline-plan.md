# 批量故事生产线实施计划

对应设计文档：`docs/superpowers/specs/2026-10-21-batch-story-pipeline-design.md`
状态：待实施

## Phase 0 · 前置（沿用按需生成的待办）

博查 key（`BOCHA_API_KEY`）待需求方申请填入 `server/.env`；无 key 时批量按「素材搜不到 → 该篇失败」降级（符合 spec §3.1），DeepSeek key 已有，可先开发与验证失败路径。

## Phase 1 · 后端共享能力

1.1 `lib/fact-check.js`（新）：`factCheckStory(material, script)` → `{ script, issues }`——DeepSeek 核查 pass，解析宽松 JSON。
1.2 `lib/ai-generate.js`：新增 `storyUserPrompt({ topic, city, material })`——含信源约束（只依据素材、无据不写、模糊表述）；`on-demand.js` 与批量共用。
1.3 `lib/story-save.js`（新）：从 `ai.js` 的 `/stories` 路由提取落库逻辑 `saveStory(s, { publish, variantScripts })` → `{ storyId, slug }`（slug 查重、variants、topics、封面、城市点位一体）；`ai.js` 改调用，无行为变化。

**验证**：`node -e` 三模块可加载；`ai.js` 单篇「存草稿/上架」curl 回归。

## Phase 2 · 批量接口（`ai.js` 追加，均需 ADMIN_TOKEN）

2.1 `lib/amap.js` 新增 `amapCityAttractions(city)`：高德文本搜索（风景名胜类，`offset=20`），返回去重名称清单；无 key 返回 []。
2.2 `POST /batch-plan`：`{ source, city?, limit? }`
- `amap-city` → amapCityAttractions；
- `on-demand` → 聚合 `ai_tasks` type='on-demand' 且 done 的 spot 名+城市频次 Top N；
- 统一按「城市+标题」与 stories 表去重（含草稿）。
2.3 `POST /batch-generate`：`{ topics:[{name, city}] }`（≤20）→ 内存任务（TTL 30 分钟，并发 2）逐篇：
搜素材（空 → failed）→ 约束写稿 → 核查 pass → transferModes 3 变体 → saveStory(publish) → 4 模式配音（失败不阻塞，前端浏览器语音兜底）→ 每篇 `ai_tasks` 留痕（type='batch'）。
2.4 `GET /batch/:jobId`：`{ done, failed, total, results }`。
2.5 `POST /ai/:id/unpublish`：status → 0（草稿），App 立即不可见。
2.6 `db/migrate-batch.js`：`ai_tasks.type` 枚举加 `batch`（幂等，同 migrate-on-demand 模式）；schema.sql 同步；package.json 加脚本。

**验证**：curl 矩阵——batch-plan 两来源（无 amap key 时列表空+提示；on-demand 源用现有留痕数据）、batch-generate 无博查 key 时全部 failed 且原因「未搜到可靠素材」、unpublish 后 `/api/stories` 不可见、jobId 404。

## Phase 3 · 按需生成升级（`on-demand.js`）

`runNarrate` 接入 `storyUserPrompt`（素材约束）+ `factCheckStory` 核查 pass，其余流程不变。

**验证**：名称路径 curl 回归（故事生成、核查生效、sourceNote 不变）；素材为空时的行为不变（DeepSeek 按名称写，标注「素材有限」——按需是即时体验，不阻断，与批量「宁可不生成」策略不同，spec §2 已注明）。

## Phase 4 · 管理面板（stats.html）

4.1 「批量生产」区块：来源切换、城市输入、拉取清单（勾选/全选）、开始生成、2s 轮询进度条与结果列表（成功 storyId / 失败原因）、失败重试（复用 batch-generate）。
4.2 「最近生成」列表新增「下架」按钮（已上架行）。
4.3 沿用 stats.html 现有 apiPost/ADMIN_TOKEN 模式。

**验证**：headless 浏览器——拉取 on-demand 来源清单、批量提交（无博查 key → 全失败路径）、下架按钮调用。

## Phase 5 · 用户端角标（app.js）

Feed 卡片与地图卡片：`s.source` 以「AI 生成」开头 → 显示「AI 生成·未核查」小角标（手写稿不显示）；播放页信源说明已有标注，不改。

**验证**：headless 浏览器——AI 故事卡片有角标、手写稿无；行程/播放回归不受影响。

## Phase 6 · 真实批量端到端（博查 key 到位后）

6.1 批量 2 篇真实跑通（含核查修正抽查 1 篇对比素材）；6.2 全流程成本对照（≈0.09 元/篇）；6.3 App 端可听、角标正确、下架后消失。

## 改动文件清单

| 文件 | Phase |
|---|---|
| `server/src/lib/fact-check.js`（新） | 1 |
| `server/src/lib/ai-generate.js` | 1 |
| `server/src/lib/story-save.js`（新） | 1 |
| `server/src/routes/ai.js` | 1-2 |
| `server/src/lib/amap.js` | 2 |
| `server/db/migrate-batch.js`（新）+ schema.sql + package.json | 2 |
| `server/src/routes/on-demand.js` | 3 |
| `stats.html` | 4 |
| `app.js` | 5 |
