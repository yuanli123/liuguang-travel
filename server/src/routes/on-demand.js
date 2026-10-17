/**
 * 按需生成（拍景点·现场听故事）：
 *   POST /api/on-demand/recognize  照片(可选)+定位(可选)+名称(可选) → 识别 → 速览(立即返回) + 故事配音(后台)
 *   GET  /api/on-demand/:jobId     轮询进度与成品
 *
 * 一次性播放不沉淀：不写 stories 库，任务与当日短缓存均为内存态（重启失效），
 * 照片用后即弃；ai_tasks 仅留成败与耗时（不含照片）。
 * 设计文档：docs/superpowers/specs/2026-10-18-on-demand-photo-story-design.md
 */
const express = require("express");
const path = require("path");
const fs = require("fs");
const pool = require("../db");
const { bochaAiSearch, bochaWebSearch } = require("../lib/websearch");
const { baiduLandmark, visionIdentify } = require("../lib/vision");
const { amapAround, amapRegeo } = require("../lib/amap");
const { callDeepseek, STORY_SYSTEM_PROMPT, normalizeStory } = require("../lib/ai-generate");
const { DEFAULT_MODE, voiceForMode, ttsOptionsForMode } = require("../lib/modes");
const { MsEdgeTTS, OUTPUT_FORMAT } = require("msedge-tts");

const router = express.Router();

const jobs = new Map();        // jobId → { spot, hasImage, stage, fast, story, audioUrl, error, startedAt }
const dailyCache = new Map();  // spotKey(城市|名称) → jobId，当日内存短缓存
const JOB_TTL = 10 * 60 * 1000;       // 任务保留 10 分钟
const JOB_TIMEOUT = 90 * 1000;        // 全链上限（spec §5）
const IMAGE_B64_MAX = 6 * 1024 * 1024; // base64 字符上限（≈4M 原图），与挂载处 json limit 一致

function sweepJobs() {
  const now = Date.now();
  for (const [id, j] of jobs) if (now - j.startedAt > JOB_TTL) jobs.delete(id);
}

function newJob(spot, hasImage) {
  const jobId = "j" + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  jobs.set(jobId, {
    spot, hasImage, stage: "searching", fast: null, story: null,
    audioUrl: null, error: null, timedOut: false, startedAt: Date.now(),
  });
  return jobId;
}

/** ai_tasks 留痕（type=on-demand；不含照片） */
async function logTask(input, status, result) {
  try {
    await pool.query(
      "INSERT INTO ai_tasks (story_id, type, input_material, status, result) VALUES (NULL, ?, ?, ?, ?)",
      ["on-demand", JSON.stringify(input || {}), status, result ? JSON.stringify(result) : null]
    );
  } catch (e) {
    console.warn("按需生成留痕失败:", e.message);
  }
}

/** chat 模式配音；失败返回 null（spec §5：文字稿兜底不阻塞） */
async function synthAudio(jobId, script) {
  try {
    const voice = voiceForMode(DEFAULT_MODE);
    const audioRoot = path.join(__dirname, "..", "..", "audio", "ondemand");
    const outDir = path.join(audioRoot, jobId);
    fs.mkdirSync(outDir, { recursive: true });
    const tts = new MsEdgeTTS();
    await tts.setMetadata(voice, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);
    const { audioFilePath } = await Promise.race([
      tts.toFile(outDir, script, ttsOptionsForMode(DEFAULT_MODE)),
      new Promise((_, rej) => setTimeout(() => rej(new Error("配音超时")), 45000)),
    ]);
    if (!audioFilePath) throw new Error("未生成音频文件");
    return "/audio/ondemand/" + path.relative(audioRoot, audioFilePath).replace(/\\/g, "/");
  } catch (e) {
    console.warn("按需生成配音失败（文字稿兜底）:", e.message);
    return null;
  }
}

/** 后台任务：搜集素材 → DeepSeek 写稿 → edge-tts 配音 */
async function runNarrate(jobId, job) {
  const timer = setTimeout(() => { job.timedOut = true; }, JOB_TIMEOUT);
  try {
    job.stage = "writing";
    const searched = await bochaWebSearch(`${job.spot.name} ${job.spot.city}`.trim());
    const material = searched ? searched.material : "";
    if (job.timedOut) return;
    const parsed = await callDeepseek([
      { role: "system", content: STORY_SYSTEM_PROMPT },
      {
        role: "user",
        content:
          `主题/景点：${job.spot.name}\n城市：${job.spot.city || "待定"}\n参考素材：` +
          (material || "无（素材不足，请基于景点常识创作，史实从模糊表述）"),
      },
    ]);
    const story = normalizeStory(parsed, job.spot.name);
    if (!story) throw new Error("生成的正文过短或缺少标题");
    if (job.timedOut) return;
    job.story = story;
    job.stage = "voicing";
    job.audioUrl = await synthAudio(jobId, story.script);
    if (job.timedOut) return;
    job.stage = "done";
    await logTask({ spot: job.spot, hasImage: job.hasImage }, "done", { hasAudio: !!job.audioUrl });
  } catch (e) {
    job.stage = "failed";
    job.error = (e && e.message) || "生成失败，请稍后重试";
    await logTask({ spot: job.spot, hasImage: job.hasImage }, "failed", { error: job.error });
  } finally {
    clearTimeout(timer);
  }
}

// POST /api/on-demand/recognize
router.post("/recognize", async (req, res) => {
  try {
    const { image, lat, lng, name } = req.body || {};
    const cleanName = typeof name === "string" ? name.trim().slice(0, 60) : "";
    const imageB64 = typeof image === "string" ? image.replace(/^data:image\/\w+;base64,/, "") : "";
    if (imageB64 && imageB64.length > IMAGE_B64_MAX) {
      return res.status(400).json({ error: "照片过大，请压缩后重试" });
    }
    const hasLoc =
      Number.isFinite(Number(lat)) && Number.isFinite(Number(lng)) &&
      Math.abs(Number(lat)) <= 90 && Math.abs(Number(lng)) <= 180;
    if (!cleanName && !hasLoc) {
      return res.status(400).json({ error: "需要定位或景点名称" });
    }
    const latN = Number(lat);
    const lngN = Number(lng);

    sweepJobs();

    // ① 确定景点：名称直达 > 照片识别（地标 → 视觉兜底）> 候选点选
    let spot = null;
    let candidates = [];
    if (cleanName) {
      spot = { name: cleanName, city: "", source: "user" };
    } else if (imageB64) {
      candidates = await amapAround(latN, lngN);
      const landmark = await baiduLandmark(imageB64);
      if (landmark) {
        spot = { name: landmark, city: "", source: "photo" };
      } else {
        const vis = await visionIdentify(imageB64, candidates, latN, lngN);
        if (vis && vis.confidence >= 0.6) {
          spot = { name: vis.name, city: "", source: "photo" };
        } else if (candidates.length) {
          return res.json({ ok: true, needConfirm: true, candidates });
        } else {
          return res.status(422).json({ error: "未能识别景点，请手动输入名称" });
        }
      }
    } else if (hasLoc) {
      candidates = await amapAround(latN, lngN);
      if (candidates.length) {
        return res.json({ ok: true, needConfirm: true, candidates });
      }
      return res.status(422).json({ error: "附近没有找到景点，请手动输入名称" });
    }

    // 城市补全（写稿与速览 query 用；失败留空不阻塞）
    if (!spot.city && hasLoc) spot.city = await amapRegeo(latN, lngN);

    // ② 当日短缓存：同景点复用任务（失败任务不缓存，允许重试）
    const cacheKey = `${spot.city}|${spot.name}`;
    const cachedId = dailyCache.get(cacheKey);
    const cached = cachedId && jobs.get(cachedId);
    if (cached && cached.stage !== "failed") {
      return res.json({ ok: true, jobId: cachedId, spot: cached.spot, fast: cached.fast, stage: cached.stage });
    }

    // ③ 速览（快路径）：现成百科信息先返回，写稿配音后台继续
    const fast = await bochaAiSearch(`${spot.name} ${spot.city}`.trim());
    const jobId = newJob(spot, !!imageB64);
    const job = jobs.get(jobId);
    job.fast = fast;
    dailyCache.set(cacheKey, jobId);
    runNarrate(jobId, job); // 不阻塞响应
    res.json({ ok: true, jobId, spot, fast, stage: "searching" });
  } catch (e) {
    res.status(500).json({ error: "识别失败：" + ((e && e.message) || "未知错误") });
  }
});

// GET /api/on-demand/:jobId —— 前端 2s 轮询
router.get("/:jobId", (req, res) => {
  const job = jobs.get(String(req.params.jobId || ""));
  if (!job) {
    return res.status(404).json({ error: "生成任务已失效，请重新拍摄" });
  }
  res.json({
    jobId: String(req.params.jobId || ""),
    stage: job.stage,
    spot: job.spot,
    fast: job.fast,
    story: job.story,
    audioUrl: job.audioUrl,
    error: job.error,
  });
});

module.exports = router;
