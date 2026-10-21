/**
 * 故事落库（AI 故事工坊与批量生产线共用）：
 *   saveStory(s, { publish, variantScripts }) → { storyId, slug, variantCount }
 *
 * 一个事务写入 stories + story_variants + story_topics；
 * 事务外自动生成封面、按城市建点位（失败不阻断，App 仍可播放）。
 */
const pool = require("../db");
const { MODE_KEYS, DEFAULT_MODE, voiceForMode } = require("./modes");
const { makeCover } = require("./cover");

// 类别名 → topics 表 id（App 卡片徽章与搜索依赖 story_topics 关联）
const TOPIC_IDS = { 传说: 1, 历史: 2, 人文: 3, 地质: 4 };

// 城市 → 经纬度：新故事自动建点位，App 地图 pin 落在真实城市
const CITY_COORDS = {
  北京: [39.9042, 116.4074], 上海: [31.2304, 121.4737],
  杭州: [30.2741, 120.1551], 苏州: [31.2989, 120.5853],
  成都: [30.5728, 104.0668], 西安: [34.3416, 108.9398],
  南京: [32.0603, 118.7969], 厦门: [24.4798, 118.0894],
};

/**
 * @param {object} s 已 normalizeStory 的故事对象
 * @param {object} opts { publish: boolean, variantScripts: Map<mode, script> }
 *   变体规则：chat 模式以主脚本为准，不接受覆盖；其余模式取 variantScripts。
 * @returns {Promise<{storyId:number, slug:string, variantCount:number}>} 保存失败抛错
 */
async function saveStory(s, { publish = false, variantScripts = new Map() } = {}) {
  const conn = await pool.getConnection();
  let storyId = 0;
  let slug = s.slug;
  let variantCount = 0;
  try {
    await conn.beginTransaction();

    // slug 查重：重名追加 -2、-3…
    const [existRows] = await conn.query("SELECT id FROM stories WHERE slug = ?", [slug]);
    if (existRows.length) {
      let n = 2;
      for (;;) {
        const cand = `${slug}-${n}`;
        const [rows] = await conn.query("SELECT id FROM stories WHERE slug = ?", [cand]);
        if (!rows.length) { slug = cand; break; }
        n += 1;
      }
    }

    const status = publish ? 2 : 0;
    const [r] = await conn.query(
      `INSERT INTO stories
         (slug, title, hook, emotion_tags, script, duration_sec, source_note, city, status, play_count, published_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ${publish ? "NOW()" : "NULL"})`,
      [slug, s.title, s.hook, JSON.stringify(s.emotionTags), s.script, s.durationSec, s.sourceNote, s.city, status]
    );
    storyId = Number(r.insertId);

    // 讲述模式变体：chat = 主脚本，其余来自请求
    for (const mode of MODE_KEYS) {
      const script = mode === DEFAULT_MODE ? s.script : variantScripts.get(mode);
      if (!script) continue;
      await conn.query(
        `INSERT INTO story_variants (story_id, mode, script, voice, duration_sec)
         VALUES (?, ?, ?, ?, ?)`,
        [storyId, mode, script, voiceForMode(mode), s.durationSec]
      );
      variantCount += 1;
    }

    // 类型标签落库：category → story_topics（App 卡片徽章/搜索依赖该关联，缺失会导致前端报错）
    const topicId = TOPIC_IDS[s.category] || TOPIC_IDS["人文"];
    await conn.query("INSERT INTO story_topics (story_id, topic_id) VALUES (?, ?)", [
      storyId,
      topicId,
    ]);

    await conn.commit();
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }

  // 事务外的事后处理（失败不阻断已保存的故事）：
  // 自动生成封面（本地 SVG 插画风）
  try {
    const coverUrl = makeCover({
      id: storyId, slug, title: s.title, city: s.city, category: s.category, hook: s.hook,
    });
    await pool.query("UPDATE stories SET cover_url = ? WHERE id = ?", [coverUrl, storyId]);
  } catch (e) {
    console.warn("封面生成失败（不影响上架）:", e.message);
  }

  // 城市能对上坐标 → 自动建点位（App 地图 pin 与距离正常显示）
  const coords = CITY_COORDS[s.city];
  if (coords) {
    try {
      const [pr] = await pool.query(
        "INSERT INTO points (name, city, lat, lng, radius_m, address) VALUES (?, ?, ?, ?, 200, '')",
        [s.title.slice(0, 64), s.city, coords[0], coords[1]]
      );
      await pool.query("INSERT INTO story_points (story_id, point_id, sort) VALUES (?, ?, 0)", [
        storyId,
        Number(pr.insertId),
      ]);
    } catch (e) {
      console.warn("点位创建失败（不影响上架）:", e.message);
    }
  }

  return { storyId, slug, variantCount };
}

module.exports = { saveStory };
