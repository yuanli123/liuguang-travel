/**
 * 景点照片识别（按需生成用）：
 *   baiduLandmark(imageBase64) → 景点名 | null（百度地标识别，覆盖著名景点）
 *   visionIdentify(imageBase64, candidates, lat, lng) → { name, confidence } | null（视觉大模型兜底）
 *
 * 未配置 key / 超时 / 上游失败一律返回 null，由调用方降级到 POI 点选（spec §5）。
 * access_token 进程内缓存（百度 token 有效期 30 天，提前 5 分钟刷新）。
 */
const config = require("../config");

const TIMEOUT = 20000;
let tokenCache = { token: "", expireAt: 0 };

async function baiduAccessToken() {
  const { landmarkKey, landmarkSecret } = config.baidu;
  if (!landmarkKey || !landmarkSecret) return "";
  if (tokenCache.token && Date.now() < tokenCache.expireAt) return tokenCache.token;
  const r = await fetch(
    "https://aip.baidubce.com/oauth/2.0/token?grant_type=client_credentials" +
      `&client_id=${encodeURIComponent(landmarkKey)}&client_secret=${encodeURIComponent(landmarkSecret)}`,
    { signal: AbortSignal.timeout(TIMEOUT) }
  );
  if (!r.ok) return "";
  const data = await r.json();
  if (!data.access_token) return "";
  tokenCache = {
    token: data.access_token,
    expireAt: Date.now() + (Number(data.expires_in) || 2592000) * 1000 - 5 * 60 * 1000,
  };
  return tokenCache.token;
}

/** 百度地标识别：返回地标名或 null */
async function baiduLandmark(imageBase64) {
  const token = await baiduAccessToken().catch(() => "");
  if (!token) return null;
  try {
    const r = await fetch(
      "https://aip.baidubce.com/rest/2.0/image-classify/v1/landmark?access_token=" + token,
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: "image=" + encodeURIComponent(imageBase64),
        signal: AbortSignal.timeout(TIMEOUT),
      }
    );
    if (!r.ok) return null;
    const data = await r.json();
    const hit = data && Array.isArray(data.result) && data.result[0];
    // 地标识别对「非地标照片」也会返回结果，配合周边 POI 校验在路由层做置信判断
    return hit && hit.landmark ? String(hit.landmark).trim() : null;
  } catch (_) {
    return null;
  }
}

/** 视觉大模型兜底：照片 + 候选 POI + 定位 → 景点名 + 置信度 */
async function visionIdentify(imageBase64, candidates, lat, lng) {
  if (!config.vision.apiKey) return null;
  const candidateText = (candidates || []).slice(0, 5).map((c) => c.name).join("、");
  const prompt =
    "这是一张用户在景点现场拍摄的照片。候选景点（来自周边 POI 搜索）：" +
    (candidateText || "无") +
    `。拍摄位置：纬度 ${lat}，经度 ${lng}。` +
    "请识别照片中的景点：优先读牌匾/招牌文字，结合建筑特征与候选列表判断。" +
    '只输出 JSON，不要其他文字：{"name":"景点名","confidence":0到1之间的小数}' +
    "。如果无法确定，输出 {\"name\":\"\",\"confidence\":0}。";
  try {
    const r = await fetch(config.vision.apiBase + "/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + config.vision.apiKey,
      },
      body: JSON.stringify({
        model: config.vision.model,
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: prompt },
              { type: "image_url", image_url: { url: "data:image/jpeg;base64," + imageBase64 } },
            ],
          },
        ],
        temperature: 0.3,
        max_tokens: 200,
      }),
      signal: AbortSignal.timeout(TIMEOUT),
    });
    if (!r.ok) return null;
    const data = await r.json();
    const raw = data.choices && data.choices[0] && data.choices[0].message
      ? data.choices[0].message.content
      : "";
    const parsed = JSON.parse(String(raw || "").replace(/```json|```/g, "").trim());
    const name = String(parsed.name || "").trim();
    const confidence = Math.max(0, Math.min(1, Number(parsed.confidence) || 0));
    if (!name || confidence <= 0) return null;
    return { name, confidence };
  } catch (_) {
    return null;
  }
}

module.exports = { baiduLandmark, visionIdentify };
