/**
 * 配音音色目录与「心情标签 → 音色」匹配表（edge-tts）。
 * 产品规则：声音随故事调性走——温柔故事用女声、悬疑用磁性男声、史诗用浑厚男声。
 * 方言音色留给未来的「方言故事」专题（西安→陕西话、东北→辽宁话）。
 */
const VOICES = [
  { name: "zh-CN-XiaoxiaoNeural", label: "晓晓", desc: "女声 · 温柔亲切", gender: "F" },
  { name: "zh-CN-XiaoyiNeural", label: "晓伊", desc: "女声 · 活泼轻快", gender: "F" },
  { name: "zh-CN-YunxiNeural", label: "云希", desc: "男声 · 磁性低沉", gender: "M" },
  { name: "zh-CN-YunjianNeural", label: "云健", desc: "男声 · 浑厚有力", gender: "M" },
  { name: "zh-CN-YunyangNeural", label: "云扬", desc: "男声 · 专业播报", gender: "M" },
  { name: "zh-CN-YunxiaNeural", label: "云夏", desc: "男声 · 清朗少年", gender: "M" },
  // 方言（脚本需对应方言书写，默认流程不自动选用）
  { name: "zh-CN-shaanxi-XiaoniNeural", label: "小妮（陕西话）", desc: "方言 · 关中味道", gender: "F" },
  { name: "zh-CN-liaoning-XiaobeiNeural", label: "小北（东北话）", desc: "方言 · 东北味道", gender: "F" },
];

const BY_NAME = Object.fromEntries(VOICES.map((v) => [v.name, v]));

// 心情标签 → 音色（App 卡片的心情标签与 AI 生成的 emotionTags 同源）
const VOICE_BY_MOOD = {
  治愈: "zh-CN-XiaoxiaoNeural",
  温暖: "zh-CN-XiaoxiaoNeural",
  怀旧: "zh-CN-XiaoyiNeural",
  神秘: "zh-CN-YunxiNeural",
  悬疑: "zh-CN-YunxiNeural",
  震撼: "zh-CN-YunjianNeural",
  悲壮: "zh-CN-YunjianNeural",
};
const DEFAULT_VOICE = "zh-CN-XiaoxiaoNeural";

/** 按故事心情标签选音色（依次匹配，无命中回退晓晓） */
function voiceForTags(tags) {
  const list = Array.isArray(tags) ? tags : [];
  for (const t of list) {
    if (VOICE_BY_MOOD[t]) return VOICE_BY_MOOD[t];
  }
  return DEFAULT_VOICE;
}

/** 校验音色名（防注入/防拼写错误），不合法返回默认 */
function sanitizeVoice(name) {
  return BY_NAME[String(name || "")] ? String(name) : DEFAULT_VOICE;
}

module.exports = { VOICES, VOICE_BY_MOOD, DEFAULT_VOICE, voiceForTags, sanitizeVoice };
