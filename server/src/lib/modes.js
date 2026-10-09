/**
 * 讲述模式目录（产品级概念）：每种模式 = 一套脚本风格 + 固定音色 + 语速。
 * 听众在播放页切换模式（story_variants 每模式一行）；音色不再由创作者手动选择。
 * 旧 voice.js 的「心情标签→音色」映射保留，仅作无变体旧数据的兜底。
 */
const MODES = [
  {
    key: "chat",
    label: "日常聊天",
    voice: "zh-CN-XiaoyiNeural",
    voiceLabel: "晓伊",
    rate: "+8%", // 略快语速营造松弛感（msedge-tts 支持 SSML rate）
    styleHint:
      "像朋友边走边聊：开头用「诶」「我跟你说」「你猜怎么着」这类口语，多用反问，短句为主，可有「……」的停顿感，像把微信语音转成了文字。",
  },
  {
    key: "story",
    label: "娓娓道来",
    voice: "zh-CN-XiaoxiaoNeural",
    voiceLabel: "晓晓",
    rate: null,
    styleHint: "温柔娓娓道来：第二人称沉浸式叙述，像夜深电台主持人讲故事，舒缓、有画面感。",
  },
  {
    key: "suspense",
    label: "悬念夜谈",
    voice: "zh-CN-YunxiNeural",
    voiceLabel: "云希",
    rate: null,
    styleHint: "悬念夜谈：短促的句子、留白与反转，像悬疑播客，氛围先行。",
  },
  {
    key: "pingshu",
    label: "说书人",
    voice: "zh-CN-YunjianNeural",
    voiceLabel: "云健",
    rate: null,
    styleHint: "说书人：评书腔，用「话说」「且说」「列位看官」开场，节奏铿锵、有评点感叹。",
  },
];

const MODE_KEYS = MODES.map((m) => m.key);
const BY_KEY = Object.fromEntries(MODES.map((m) => [m.key, m]));
const DEFAULT_MODE = "chat";
const STYLE_HINTS = Object.fromEntries(MODES.map((m) => [m.key, m.styleHint]));

/** 校验模式 key（防注入/防拼写错误） */
function isValidMode(key) {
  return Object.prototype.hasOwnProperty.call(BY_KEY, key);
}

/** 模式 → 音色（不合法回退默认模式） */
function voiceForMode(key) {
  return (BY_KEY[key] || BY_KEY[DEFAULT_MODE]).voice;
}

/** 模式 → tts 合成参数（toFile 的 ProsodyOptions；无 rate 时返回空对象） */
function ttsOptionsForMode(key) {
  const m = BY_KEY[key] || BY_KEY[DEFAULT_MODE];
  return m.rate ? { rate: m.rate } : {};
}

/**
 * 风格转换的通用约束（生成与批量补全共用）：
 * 事实一致性优先 —— 4 个模式必须讲同一套事实，只改叙事风格。
 */
const TRANSFER_RULES =
  "保持原文的事实、人物、年代与关键情节不变，不新增不删减史实；长度 350-550 字；口语化短句；段落用换行分隔。只输出一个 JSON 对象：{\"script\":\"…\"}";

module.exports = {
  MODES,
  MODE_KEYS,
  BY_KEY,
  DEFAULT_MODE,
  STYLE_HINTS,
  isValidMode,
  voiceForMode,
  ttsOptionsForMode,
  TRANSFER_RULES,
};
