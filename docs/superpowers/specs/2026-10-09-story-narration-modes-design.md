# 故事讲述模式（Narration Modes）设计文档

| 项目 | 内容 |
|------|------|
| 日期 | 2026-10-09 |
| 状态 | 已与需求方逐节确认 |
| 相关文档 | `prd.md`、`server/README.md`、`roadmap.md` |

## 1. 背景与目标

**问题**：现有故事讲解偏「官方/播音腔」，与产品「解压、疗愈、情绪价值」的定位不符。用户要求：

1. 讲解改为**日常聊天模式**（默认）；
2. 提供**几种讲述模式**，由**听众在播放页随时选择**。

**已确认的决策**（与需求方逐项确认）：

- 选择权在**听众播放时**（不是内容制作者生成时）；
- 模式共 **4 种**：日常聊天（默认）/ 娓娓道来 / 悬念夜谈 / 说书人；
- 存量 14 篇（12 手写 + 2 AI）**批量补全** 4 模式；
- 存储方案采用 **变体表（方案 A）**。

**硬约束**：edge-tts 没有真正「闲聊感」的音色（现有 8 个中文音色均为广播/有声书腔）。「日常聊天」的松弛感由三部分营造：**口语化脚本**（「诶，我跟你说」「你猜怎么着」、短句、反问）+ **活泼音色**（晓伊）+ **语速微调**（`rate +8%`，已核实 msedge-tts 2.0.7 的 `toFile` 支持 SSML 标准 `rate`/`pitch` 参数）。

**关键事实**：12 篇手写稿已是故事化叙事（第二人称、场景感、悬念收尾），文风最接近「娓娓道来」，迁移时**直接作为该模式的脚本**，不重写。

## 2. 模式目录

新文件 `server/src/lib/modes.js`（模式是产品级概念，与音色分离成文件）：

| key | 名称 | 音色（edge-tts） | 语速 | 说明 |
|---|---|---|---|---|
| `chat` | 日常聊天 | 晓伊 `zh-CN-XiaoyiNeural`（活泼轻快） | `+8%` | **默认模式**，朋友唠嗑式 |
| `story` | 娓娓道来 | 晓晓 `zh-CN-XiaoxiaoNeural`（温柔亲切） | `+0%` | 最接近现有 12 篇手写稿风格 |
| `suspense` | 悬念夜谈 | 云希 `zh-CN-YunxiNeural`（磁性低沉） | `+0%` | 悬疑播客式 |
| `pingshu` | 说书人 | 云健 `zh-CN-YunjianNeural`（浑厚有力） | `+0%` | 评书腔 |

- 模式中文名由前端映射（`app.js` 与 `stats.html` 各存一份常量，与现有城市列表做法一致）。
- 旧 `voice.js` 的 `VOICE_BY_MOOD`（心情标签→音色）**保留**，仅作为无变体旧数据的兜底，不再主导新合成；新合成一律由 `modes.js` 按模式定音色与语速。

**各模式生成提示词要点**（写入 `modes.js` 供生成管线引用）：

| 模式 | 提示词风格指令 |
|---|---|
| `chat` | 像朋友边走边聊：用「诶」「我跟你说」「你猜怎么着」开头，多用反问，短句，可有「……」停顿感，像微信语音转文字 |
| `story` | 温柔娓娓道来：第二人称沉浸式叙述，像夜深电台主持人讲故事，舒缓、有画面感 |
| `suspense` | 悬念夜谈：短促句子、留白与反转，像悬疑播客，氛围先行 |
| `pingshu` | 说书人：评书腔「话说」「且说」「列位看官」，节奏铿锵、有评点感叹 |

所有模式共用约束：**保持原文事实与关键情节不变，不新增不删减史实；350-550 字；口语化短句**。

## 3. 数据模型

### 3.1 新表 `story_variants`（加入 `server/db/schema.sql`，可重复执行）

```sql
CREATE TABLE IF NOT EXISTS story_variants (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  story_id INT UNSIGNED NOT NULL,
  mode VARCHAR(20) NOT NULL,            -- chat | story | suspense | pingshu
  script TEXT NOT NULL,
  audio_url VARCHAR(255) DEFAULT NULL,  -- NULL = 未配音，播放时回退浏览器语音合成
  voice VARCHAR(64) NOT NULL,           -- edge-tts 音色名
  duration_sec INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uk_story_mode (story_id, mode),
  CONSTRAINT fk_variants_story FOREIGN KEY (story_id) REFERENCES stories(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

### 3.2 `stories` 表加列

```sql
ALTER TABLE stories ADD COLUMN default_mode VARCHAR(20) NOT NULL DEFAULT 'chat';
```

（`schema.sql` 以 CREATE TABLE IF NOT EXISTS 方式直接带上该列；迁移脚本对已存在的库执行 ALTER，并容忍列已存在。）

### 3.3 迁移脚本 `server/db/migrate-variants.js`

幂等、可重复执行：

1. 建 `story_variants` 表、补 `stories.default_mode` 列；
2. 对每篇有 `script` 的存量故事，若无 `mode='story'` 变体，则以其现有 `script` + `audio_url` 插入（音色取故事当前配音所用音色，未知则默认晓晓；`duration_sec` 取现有值）；
3. 全库 `default_mode='chat'`（存量故事的 chat 变体由批量补全脚本后续填充）。

## 4. API 契约

### 4.1 `GET /api/stories/:id`（响应扩展，向后兼容）

```
story.*           原有字段不变
story.script      = 默认模式的脚本（老客户端不破）
story.audioUrl    = 默认模式的音频
story.defaultMode = "chat"
variants = [
  { mode, script, audioUrl, voice, durationSec },  // 按 chat→story→suspense→pingshu 固定顺序，仅含实际存在的变体
]
```

无任何变体记录的故事（迁移未跑/新装环境）：服务端读取时把 `story.script` 现场合成一个 `mode='story'` 的虚拟变体返回——旧数据永远可渲染。

### 4.2 新增管理接口（均需 `ADMIN_TOKEN`）

| 接口 | 入参 | 说明 |
|---|---|---|
| `POST /api/admin/ai/variants` | `{ storyId }` | 为单篇补生成缺失变体（两阶段管线，见 §5）；已存在的模式跳过 |
| `POST /api/admin/ai/variant-tts` | `{ storyId, mode }` | 按模式合成配音（音色/语速由 `modes.js` 定）；写回该变体 `audio_url` |

### 4.3 存量接口处理

- `POST /api/admin/ai/stories`：扩展接收 `variants: [{mode, script}]`，故事 + 变体**一个事务**写入，草稿/上架逻辑不变。
- `POST /api/admin/ai/tts`：**保留接口不动**（避免破坏已有调用），但工坊面板不再暴露；新合成统一走 `variant-tts`。

## 5. 生成管线

**原则：事实一致性优先。** 4 个模式必须讲同一套事实，因此不用 4 次独立生成（会漂移出 4 个版本的事实），而是两阶段：

```
第一阶段：聊天模式提示词 → 元数据（标题/钩子/情绪标签/分类/城市/slug/信源）+ chat 脚本
第二阶段：chat 脚本 → 3 次并行风格转换（story / suspense / pingshu 各自的提示词 + 全文输入）
```

- 每次生成在 `ai_tasks` 表留痕（现有机制），失败 status=failed 含错误信息。
- 第二阶段任一转换失败**不阻塞保存**：元数据 + 已成功的变体照常可保存，缺失模式标记「生成失败，可稍后补变体」。

**批量补全脚本 `server/scripts/backfill-variants.js`**（独立 CLI，一次性任务，不进工坊 UI）：

- 对每篇存量故事：`story` 变体已存在（迁移而来），补 `chat / suspense / pingshu` 三个变体；
- **转换源是现有 `story` 脚本**（不是重新生成元数据——存量故事的标题/钩子已上线，重新生成会导致 Feed 卡片漂移），3 次并行风格转换 `story → chat / suspense / pingshu`；
- 参数：`--dry-run`（只列计划不调用）、`--limit N`（先跑少量验证）、默认断点续跑（4 个变体齐全的故事自动跳过）；
- 逐篇 try/catch，失败留痕 `ai_tasks`；
- 执行顺序：先 `--dry-run` → `--limit 1` 人工审文风与事实 → 全量 14 篇。

## 6. 播放器交互（`app.js` / `index.html`）

**新增「讲述方式」切换行**，位于情绪标签（`playerMood`）正下方，一行 4 个胶囊按钮：

```
情绪标签：治愈 · 神秘
讲述方式：[日常聊天] [娓娓道来] [悬念夜谈] [说书人]   ← 新增
```

规则：

1. 仅当故事有 **≥2 个变体**时显示该行；只显示实际存在的模式按钮，不出现死入口；
2. 点击切换 = 停当前播放 → 载入该变体脚本 + 音频 → 从 0 开始播；标题/钩子/情绪标签（故事级）不变；
3. 模式记忆：`localStorage` 存 `{故事id: 模式}`，重开播放页优先用上次模式，否则用 `defaultMode`；MVP 不进云端同步；断点续播保持故事级，续播落在上次使用的模式上（模式间长度差异导致的进度偏差属可接受误差）；
4. 回退链每模式独立成立：变体无音频或音频加载失败 → 现有 `onAudioError` → 浏览器语音合成读该变体脚本。

## 7. 工坊改造（`stats.html` AI 故事工坊）

- **删除**旧「风格」下拉（治愈/悬疑/史诗/纪实）：情绪风格已被讲述模式覆盖，双维度并存会造成困惑；
- 生成流程改为两阶段管线（§5），结果面板 = **元数据编辑区（一份，故事级）+ 4 个标签页**（每页一个可编辑脚本）；
- 每个标签页一个「配音」按钮 → `variant-tts`，音色由模式固定，**移除手动音色下拉**（音色=模式的产物，不是创作者的自由选择）；
- AI 列表加「补变体」按钮 → `POST /api/admin/ai/variants`；
- 批量补全为独立 CLI（§5），不做界面。

## 8. 错误处理与回退

不变式：**任何情况下播放器都能出声**。回退链优先级：`变体音频 → 浏览器语音合成读变体脚本 → 无声但可读（错误提示）`。

1. 变体 `audio_url=null` → 直接浏览器语音合成；
2. 音频加载失败 → 现有 `onAudioError` 从当前位置回退语音合成；
3. 老数据兜底：无变体的故事由 API 现场合成 `mode='story'` 虚拟变体（§4.1）；
4. `defaultMode` 指向的变体缺失 → 按 `chat → story → suspense → pingshu` 取第一个存在的；
5. 批量补全：逐篇 try/catch、断点续跑、`ai_tasks` 留痕；
6. 风格转换失败不阻塞保存（§5）；
7. DeepSeek 调用失败 → 502 + 中文错误（现有模式）。

## 9. 测试方案

沿用项目现有验证风格（curl 冒烟 + 无头浏览器冒烟，脚本放 `%TEMP%\liuguang-smoke\`）。

**静态与数据库**
- `node --check` 覆盖所有改动文件；
- 迁移幂等：`migrate-variants.js` 连跑两次状态一致；
- 存量 12 篇手写稿迁移后：`mode='story'` 变体存在、`audio_url` 与迁移前一致。

**API 冒烟（curl）**
- 迁移前（旧库形态）：`GET /api/stories/:id` 返回合成 story 虚拟变体，`defaultMode` 有值；
- 迁移后：`variants` 数组含全部模式；`story.script` 与 chat 变体脚本一致；
- `variant-tts` / `variants` 鉴权（无 token 401）与参数校验。

**无头浏览器冒烟**
- 播放页出现「讲述方式」行，默认选中 chat（或上次记忆模式）；
- 逐一点击 4 模式：脚本文本切换、音频 src 切换、进度归零重播；
- 变体无音频 → 语音合成回退；音频坏 → `onAudioError` 续读；
- 播放中途切换：旧播放停止、无串音；
- 仅 1 个变体的故事：切换行隐藏，行为与旧版一致（回归）；
- 回归：倍速、收藏、加入行程、纠错、下一个推荐、断点续播在变体模式下正常；
- 工坊：生成 → 4 标签页编辑 → 保存草稿/上架 → 补变体 → 按模式配音。

**真实 AI 调用**（需 DeepSeek key）
- `backfill-variants.js --dry-run` 核对计划；
- `--limit 1` 跑一篇，人工审 4 模式文风与事实一致性，通过后全量。

## 10. 实施范围清单

| 文件 | 改动 |
|---|---|
| `server/db/schema.sql` | 新增 `story_variants` 表；`stories` 带 `default_mode` 列 |
| `server/db/migrate-variants.js` | 新增：迁移脚本（幂等） |
| `server/src/lib/modes.js` | 新增：模式目录（key/名称/音色/语速/提示词） |
| `server/src/lib/voice.js` | 保留作兜底；注释指向 modes.js |
| `server/src/routes/ai.js` | 两阶段生成管线；`/stories` 接受 variants；新增 `/variants`、`/variant-tts` |
| `server/src/routes/stories.js` | 详情响应扩展 variants/defaultMode；老数据虚拟变体兜底 |
| `server/scripts/backfill-variants.js` | 新增：批量补全 CLI |
| `stats.html` | 工坊：删风格下拉、4 标签页、按模式配音、补变体按钮 |
| `app.js` | 播放器：模式切换行、模式记忆、回退链按变体路由 |
| `index.html` | 播放页新增模式切换行容器 |
| `server/README.md` | 接口与新流程文档 |

**明确不做（MVP 边界）**：模式维度的播放统计（`play_history` 暂不记录 mode，后续阶段再说）；模式记忆云端同步；方言模式（`voice.js` 预留的陕西/东北话后续可复用本套变体结构）。

## 11. 修订记录

| 版本 | 日期 | 说明 |
|------|------|------|
| v1.0 | 2026-10-09 | 首版，6 节内容经需求方逐节确认后成文 |
