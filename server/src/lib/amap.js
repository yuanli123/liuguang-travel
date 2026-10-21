/**
 * 高德 Web 服务封装（按需生成用）：
 *   amapAround(lat, lng) → 周边 POI 候选 [{ name, type, distanceM }] | []
 *   amapRegeo(lat, lng)  → 城市名 | ""
 *
 * key 未配置 / 超时 / 失败一律降级为空，不抛错。
 * 注意：AMap key 需在控制台开通「Web 服务」类型才能调用 REST 接口。
 */
const config = require("../config");

const BASE = "https://restapi.amap.com/v3";
const TIMEOUT = 8000;

async function amapGet(path) {
  const r = await fetch(BASE + path + "&key=" + encodeURIComponent(config.amap.webKey), {
    signal: AbortSignal.timeout(TIMEOUT),
  });
  if (!r.ok) return null;
  return r.json();
}

/** 周边搜索：按距离取前 5 个 POI 候选 */
async function amapAround(lat, lng) {
  if (!config.amap.webKey) return [];
  try {
    const data = await amapGet(
      `/place/around?location=${lng},${lat}&radius=800&sortrule=distance&offset=5&extensions=base`
    );
    if (!data || data.status !== "1" || !Array.isArray(data.pois)) return [];
    return data.pois.slice(0, 5).map((p) => ({
      name: String(p.name || "").trim(),
      type: String(p.type || ""),
      distanceM: Number(p.distance) || 0,
    }));
  } catch (_) {
    return [];
  }
}

/** 逆地理编码：坐标 → 城市名（不含「市」后缀，与 App 端城市口径一致） */
async function amapRegeo(lat, lng) {
  if (!config.amap.webKey) return "";
  try {
    const data = await amapGet(`/geocode/regeo?location=${lng},${lat}&extensions=base`);
    const comp = data && data.regeocode && data.regeocode.addressComponent;
    if (!comp) return "";
    const city = comp.city;
    if (Array.isArray(city)) return String(city[0] || "").replace(/市$/, "");
    return String(city || "").replace(/市$/, "");
  } catch (_) {
    return "";
  }
}

/**
 * 按城市拉取景点清单（批量生产线选题来源）：
 * 高德 POI 文本搜索，风景名胜大类（types=110000，实现时以高德 POI 分类文档为准）。
 * 返回按名称去重的清单；无 key / 失败返回 []。
 */
async function amapCityAttractions(city) {
  if (!config.amap.webKey) return [];
  const seen = new Set();
  const names = [];
  try {
    // 翻两页凑够候选（每页 offset 20，POI 接口上限 25）
    for (const page of [1, 2]) {
      const data = await amapGet(
        `/place/text?keywords=${encodeURIComponent("景区")}&city=${encodeURIComponent(city)}` +
          `&types=110000&offset=20&page=${page}&extensions=base`
      );
      if (!data || data.status !== "1" || !Array.isArray(data.pois)) break;
      for (const p of data.pois) {
        const name = String(p.name || "").trim();
        if (name && !seen.has(name)) {
          seen.add(name);
          names.push(name);
        }
      }
      if (names.length >= 40) break;
    }
    return names;
  } catch (_) {
    return names;
  }
}

module.exports = { amapAround, amapRegeo, amapCityAttractions };
