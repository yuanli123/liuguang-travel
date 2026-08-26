/** GET /api/geo/ip —— IP → 城市（定位权限被拒时的兜底）
 *  高德自带 IP 定位在部分网络环境（运营商 NAT 等）不可用，此处经第三方免费
 *  IP 库（太平洋电脑网）查询，仅返回城市名、无坐标。失败不报错，返回 city:null。 */
const express = require("express");
const { TextDecoder } = require("util");

const router = express.Router();

// 内网/环回地址不传 ip 参数（开发期前后端同机，让上游按服务器出口 IP 定位）
const PRIVATE_RE = /^(127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|::1$|fe80)/i;

router.get("/ip", async (req, res) => {
  const clientIp = String(req.ip || "").replace(/^::ffff:/, "");
  const qs =
    clientIp && !PRIVATE_RE.test(clientIp)
      ? `?ip=${encodeURIComponent(clientIp)}&json=true`
      : "?json=true";
  try {
    const r = await fetch("https://whois.pconline.com.cn/ipJson.jsp" + qs, {
      signal: AbortSignal.timeout(5000),
      headers: { "User-Agent": "liuguang-travel/0.1" },
    });
    if (!r.ok) throw new Error("ip http " + r.status);
    const buf = Buffer.from(await r.arrayBuffer());
    const text = new TextDecoder("gbk").decode(buf); // 上游返回 GBK 编码
    const m = text.match(/\{[\s\S]*\}/);
    const data = JSON.parse(m ? m[0] : text);
    const city = String(data.city || "").replace(/市$/, "");
    res.json({ city: city || null });
  } catch (_) {
    res.json({ city: null }); // 兜底服务失败不报错，前端按无城市处理
  }
});

module.exports = router;
