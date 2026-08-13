/**
 * 流光幻旅 — 前端演示（增强版）
 * 依据 PRD V1.0 开发
 *
 * 新增能力：
 *  - 真实地理定位（浏览器 Geolocation API）
 *  - 200m 近距离故事检测
 *  - 断点续播（per-story 进度持久化）
 *  - localStorage 全量状态持久化
 *  - 12+ 故事数据（带真实 lat/lng）
 *  - 隐私权限说明
 *  - 播放进度追踪 & 完播标记
 */

/* ================================================================
   Demo 音频
   ================================================================ */
const DEMO_AUDIO =
  "https://interactive-examples.mdn.mozilla.net/media/cc0-audio/t-rex-roar.mp3";

/* ================================================================
   城市 / 标签
   ================================================================ */
const CITIES = ["全部", "北京", "上海", "杭州", "苏州", "成都", "西安", "南京", "厦门"];

/* ================================================================
   故事数据（lat/lng 为真实景区坐标）
   ================================================================ */
const STORIES = [
  {
    id: "kunming",
    title: "昆明湖的呼吸",
    spot: "颐和园 · 昆明湖",
    city: "北京",
    mood: "治愈",
    category: "传说",
    hook: "这片湖水，藏着一个关于疗愈的古老传说。",
    durationMin: 2,
    durationSec: 120,
    plays: "8.2万",
    cover:
      "https://images.unsplash.com/photo-1508804185872-d7badad00f7d?w=800&q=80",
    mapPin: { x: 28, y: 38 },
    lat: 39.9999,
    lng: 116.2755,
    source: "参考自颐和园管理处公开资料、相关文史摘编（演示）。",
  },
  {
    id: "forbidden",
    title: "紫禁城的最后一夜",
    spot: "北京 · 故宫",
    city: "北京",
    mood: "震撼",
    category: "历史",
    hook: "那一夜，宫门内外的呼吸，曾决定一个时代的走向。",
    durationMin: 3,
    durationSec: 180,
    plays: "12.8万",
    cover:
      "https://images.unsplash.com/photo-1589519160736-7f15a9f7f519?w=800&q=80",
    mapPin: { x: 62, y: 32 },
    lat: 39.9163,
    lng: 116.3972,
    source: "参考自《故宫史话》节选、维基百科相关条目（演示）。",
  },
  {
    id: "bund",
    title: "外滩钟声里的金融往事",
    spot: "上海 · 外滩",
    city: "上海",
    mood: "神秘",
    category: "历史",
    hook: "钟声响起时，江风曾把多少秘密吹进石库门？",
    durationMin: 4,
    durationSec: 240,
    plays: "6.5万",
    cover:
      "https://images.unsplash.com/photo-1538428494232-9c0d0a9e1e99?w=800&q=80",
    mapPin: { x: 72, y: 58 },
    lat: 31.2400,
    lng: 121.4908,
    source: "参考自上海地方志公开摘要、媒体报道汇编（演示）。",
  },
  {
    id: "westlake",
    title: "断桥不断，人心相连",
    spot: "杭州 · 西湖",
    city: "杭州",
    mood: "治愈",
    category: "传说",
    hook: "白娘子没告诉你的，是这座桥真正的「断」与「连」。",
    durationMin: 3,
    durationSec: 180,
    plays: "15.2万",
    cover:
      "https://images.unsplash.com/photo-1548013146-72479768bada?w=800&q=80",
    mapPin: { x: 42, y: 52 },
    lat: 30.2590,
    lng: 120.1458,
    source: "参考自民间传说整理、西湖文化景观介绍（演示）。",
  },
  {
    id: "suzhou",
    title: "园林里的时间褶皱",
    spot: "苏州 · 拙政园",
    city: "苏州",
    mood: "治愈",
    category: "人文",
    hook: "一步一景背后，是古人如何把焦虑折叠进假山与池水。",
    durationMin: 5,
    durationSec: 300,
    plays: "4.1万",
    cover:
      "https://images.unsplash.com/photo-1528164344705-47542687000d?w=800&q=80",
    mapPin: { x: 48, y: 68 },
    lat: 31.3260,
    lng: 120.6250,
    source: "参考自苏州园林博物馆解说词摘要（演示）。",
  },
  {
    id: "greatwall",
    title: "砖缝里的风声史诗",
    spot: "北京 · 八达岭长城",
    city: "北京",
    mood: "震撼",
    category: "地质",
    hook: "每一块砖，都听过比史书更长的风。",
    durationMin: 6,
    durationSec: 360,
    plays: "9.9万",
    cover:
      "https://images.unsplash.com/photo-1508804052814-cd3ad865b072?w=800&q=80",
    mapPin: { x: 35, y: 22 },
    lat: 40.3597,
    lng: 116.0203,
    source: "参考自地质出版社科普读物摘要、景区公开介绍（演示）。",
  },
  // --- 新增故事 ---
  {
    id: "kuaizhai",
    title: "宽窄巷子的茶香密码",
    spot: "成都 · 宽窄巷子",
    city: "成都",
    mood: "治愈",
    category: "人文",
    hook: "三条巷子，三种人生——老成都的慢哲学，藏在一碗盖碗茶里。",
    durationMin: 3,
    durationSec: 180,
    plays: "7.3万",
    cover:
      "https://images.unsplash.com/photo-1590559899731-a382839e5549?w=800&q=80",
    mapPin: { x: 18, y: 55 },
    lat: 30.6680,
    lng: 104.0560,
    source: "参考自成都市地方志、宽窄巷子文化保护资料（演示）。",
  },
  {
    id: "terracotta",
    title: "兵马俑：地下军团的沉默",
    spot: "西安 · 秦始皇兵马俑",
    city: "西安",
    mood: "震撼",
    category: "历史",
    hook: "八千张面孔，没有两张完全相同——两千年前的工匠想告诉世界什么？",
    durationMin: 5,
    durationSec: 300,
    plays: "18.6万",
    cover:
      "https://images.unsplash.com/photo-1566832135295-ff1fb1ce85b5?w=800&q=80",
    mapPin: { x: 52, y: 38 },
    lat: 34.3849,
    lng: 109.2733,
    source: "参考自秦始皇帝陵博物院公开资料、考古报告摘要（演示）。",
  },
  {
    id: "qinhuai",
    title: "秦淮河的另一种波光",
    spot: "南京 · 秦淮河",
    city: "南京",
    mood: "神秘",
    category: "传说",
    hook: "灯影浆声之下，六朝金粉里有多少故事未曾浮出水面？",
    durationMin: 4,
    durationSec: 240,
    plays: "5.8万",
    cover:
      "https://images.unsplash.com/photo-1583417319070-4a69db38a482?w=800&q=80",
    mapPin: { x: 62, y: 62 },
    lat: 32.0213,
    lng: 118.7922,
    source: "参考自《金陵琐志》、南京地方文献汇编（演示）。",
  },
  {
    id: "dujiangyan",
    title: "都江堰：水的千年智慧",
    spot: "成都 · 都江堰",
    city: "成都",
    mood: "震撼",
    category: "地质",
    hook: "没有大坝，如何让一条狂暴的江水平静了两千年？",
    durationMin: 4,
    durationSec: 240,
    plays: "6.1万",
    cover:
      "https://images.unsplash.com/photo-1564419320409-9e2b0e44b36b?w=800&q=80",
    mapPin: { x: 12, y: 48 },
    lat: 31.0016,
    lng: 103.6076,
    source: "参考自都江堰管理局公开资料、水利工程史研究（演示）。",
  },
  {
    id: "dayanta",
    title: "大雁塔下的取经人",
    spot: "西安 · 大雁塔",
    city: "西安",
    mood: "神秘",
    category: "历史",
    hook: "玄奘从这里出发时不知道，他带回的不只是经书，还有一个文明的转折。",
    durationMin: 3,
    durationSec: 180,
    plays: "8.9万",
    cover:
      "https://images.unsplash.com/photo-1547981609-4b6bfe67ca0b?w=800&q=80",
    mapPin: { x: 48, y: 48 },
    lat: 34.2196,
    lng: 108.9638,
    source: "参考自大慈恩寺志、《大唐西域记》相关研究（演示）。",
  },
  {
    id: "gulangyu",
    title: "鼓浪屿的琴声密码",
    spot: "厦门 · 鼓浪屿",
    city: "厦门",
    mood: "治愈",
    category: "人文",
    hook: "一座小岛，为什么走出了中国最多的钢琴家？海风中藏着答案。",
    durationMin: 3,
    durationSec: 180,
    plays: "11.2万",
    cover:
      "https://images.unsplash.com/photo-1559066650-0b6c6b0e28a2?w=800&q=80",
    mapPin: { x: 68, y: 78 },
    lat: 24.4479,
    lng: 118.0695,
    source: "参考自鼓浪屿世界文化遗产申报文本、鼓浪屿钢琴博物馆资料（演示）。",
  },
];

/* ================================================================
   城市行前预览
   ================================================================ */
const CITY_SUMMARY = {
  北京: {
    oneLiner: "皇城根下，每一步都能踩到故事的年轮。",
    stats: [
      { label: "故事点位", value: "120+" },
      { label: "治愈向", value: "35%" },
      { label: "历史向", value: "42%" },
    ],
  },
  上海: {
    oneLiner: "江风与霓虹之间，藏着近代中国的呼吸。",
    stats: [
      { label: "故事点位", value: "85+" },
      { label: "都市传奇", value: "28%" },
    ],
  },
  杭州: {
    oneLiner: "湖光山色里，传说与日常温柔地叠在一起。",
    stats: [
      { label: "故事点位", value: "70+" },
      { label: "传说类", value: "40%" },
    ],
  },
  苏州: {
    oneLiner: "园林与运河，把江南的慢写进了砖瓦。",
    stats: [{ label: "故事点位", value: "55+" }],
  },
  成都: {
    oneLiner: "火锅翻滚的不仅是辣椒，还有三千年的市井故事。",
    stats: [
      { label: "故事点位", value: "90+" },
      { label: "人文类", value: "38%" },
    ],
  },
  西安: {
    oneLiner: "每一寸黄土下面，都可能睡着一个王朝的呼吸。",
    stats: [
      { label: "故事点位", value: "150+" },
      { label: "历史向", value: "55%" },
    ],
  },
  南京: {
    oneLiner: "六朝烟雨中，悲欢离合都化作了梧桐树影。",
    stats: [
      { label: "故事点位", value: "75+" },
      { label: "传说类", value: "32%" },
    ],
  },
  厦门: {
    oneLiner: "海浪与琴声之间，一座岛屿把时光调慢了半拍。",
    stats: [{ label: "故事点位", value: "45+" }],
  },
};

/* ================================================================
   全局状态（含持久化字段）
   ================================================================ */
const STORAGE_KEY = "liuguang_state_v2";

const defaultState = {
  nav: "map",
  cityFilter: "全部",
  mapSelectedId: null,
  currentPlayId: null,
  tripIds: [],
  favIds: [],
  historyIds: [],
  loginDismissed: false,
  feedSearchOpen: false,
  playbackProgress: {}, // { storyId: seconds_played }
  playbackCompleted: {}, // { storyId: true } — 已完播
  userLat: null,
  userLng: null,
  locationGranted: false,
};

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      // 浅合并：只取 defaultState 中存在的 key
      const merged = { ...defaultState };
      for (const k of Object.keys(defaultState)) {
        if (k in parsed) merged[k] = parsed[k];
      }
      return merged;
    }
  } catch (_) {
    /* 忽略损坏的存储 */
  }
  return { ...defaultState };
}

function saveState() {
  try {
    const toSave = {};
    for (const k of Object.keys(defaultState)) {
      toSave[k] = state[k];
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
  } catch (_) {
    /* 存储满或不可用 */
  }
}

const state = loadState();

/* ================================================================
   DOM 工具
   ================================================================ */
function $(id) {
  return document.getElementById(id);
}

function formatRemain(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) return "--:--";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

function getStory(id) {
  return STORIES.find((s) => s.id === id);
}

function getNextRecommend(currentId) {
  const idx = STORIES.findIndex((s) => s.id === currentId);
  if (idx < 0) return STORIES[0];
  return STORIES[(idx + 1) % STORIES.length];
}

function toast(msg) {
  // 移除已有 toast
  document.querySelectorAll(".toast-msg").forEach((t) => t.remove());
  const t = document.createElement("div");
  t.textContent = msg;
  t.className = "toast-msg";
  t.style.cssText =
    "position:fixed;bottom:88px;left:50%;transform:translateX(-50%);" +
    "background:rgba(28,36,51,.92);color:#fff;padding:10px 16px;border-radius:999px;" +
    "font-size:13px;z-index:300;max-width:90%;text-align:center;" +
    "animation:toastIn .25s ease;";
  document.body.appendChild(t);
  setTimeout(() => {
    t.style.opacity = "0";
    t.style.transition = "opacity .25s";
    setTimeout(() => t.remove(), 260);
  }, 1600);
}

/* ================================================================
   导航
   ================================================================ */
function setNav(name) {
  state.nav = name;
  document.querySelectorAll(".view").forEach((v) => v.classList.remove("active"));
  $(`view-${name}`).classList.add("active");
  document.querySelectorAll(".nav-item").forEach((n) => {
    n.classList.toggle("active", n.dataset.nav === name);
  });
  saveState();
}

function bindNav() {
  document.querySelectorAll(".nav-item").forEach((btn) => {
    btn.addEventListener("click", () => setNav(btn.dataset.nav));
  });
}

/* ================================================================
   地理定位服务
   ================================================================ */
function calcDistance(lat1, lng1, lat2, lng2) {
  const R = 6371000; // 地球半径（米）
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function getNearbyStories(radiusMeters = 200) {
  if (state.userLat == null || state.userLng == null) return [];
  return STORIES.filter((s) => {
    const d = calcDistance(state.userLat, state.userLng, s.lat, s.lng);
    return d <= radiusMeters;
  });
}

function formatDistance(meters) {
  if (meters < 1000) return `${Math.round(meters)}m`;
  return `${(meters / 1000).toFixed(1)}km`;
}

function requestUserLocation() {
  if (!navigator.geolocation) {
    toast("当前浏览器不支持地理定位");
    return;
  }

  navigator.geolocation.getCurrentPosition(
    (pos) => {
      state.userLat = pos.coords.latitude;
      state.userLng = pos.coords.longitude;
      state.locationGranted = true;
      saveState();
      toast(`已定位（精度约 ${Math.round(pos.coords.accuracy)}m）`);
      updateMapLocationUI();
      checkNearbyProximity();
    },
    (err) => {
      state.locationGranted = false;
      saveState();
      switch (err.code) {
        case err.PERMISSION_DENIED:
          toast("定位权限被拒绝，可手动搜索城市");
          break;
        case err.TIMEOUT:
          toast("定位超时，请重试");
          break;
        default:
          toast("定位失败，可手动搜索城市");
      }
    },
    { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
  );
}

function updateMapLocationUI() {
  const existing = document.querySelector(".map-location-status");
  if (existing) existing.remove();

  if (state.userLat != null && state.userLng != null) {
    const badge = document.createElement("div");
    badge.className = "map-location-status";
    badge.style.cssText =
      "position:absolute;top:8px;right:16px;z-index:4;" +
      "padding:6px 12px;border-radius:999px;" +
      "background:rgba(46,196,182,.9);color:#fff;font-size:12px;font-weight:600;" +
      "box-shadow:0 2px 12px rgba(46,196,182,.35);";
    badge.textContent = "📍 已定位";
    badge.addEventListener("click", requestUserLocation);
    $("mapStage").appendChild(badge);
  }
}

let lastProximityToast = 0;
function checkNearbyProximity() {
  const nearby = getNearbyStories(200);
  if (nearby.length === 0) return;

  // 防抖：30 秒内不重复弹
  const now = Date.now();
  if (now - lastProximityToast < 30000) return;
  lastProximityToast = now;

  const s = nearby[0];
  // 静默展示地图卡片（如果当前没有选中的卡片）
  if (!state.mapSelectedId) {
    selectMapStory(s.id);
    toast(`📍 你已进入「${s.title}」的故事范围`);
  }

  // 高亮附近的故事点位
  document.querySelectorAll(".map-pin").forEach((pin) => {
    const sid = pin.dataset.id;
    const isNearby = nearby.some((ns) => ns.id === sid);
    pin.classList.toggle("nearby", isNearby);
  });
}

// 初始化时恢复定位
function initGeolocation() {
  if (state.locationGranted && state.userLat != null) {
    updateMapLocationUI();
    // 静默更新位置
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          state.userLat = pos.coords.latitude;
          state.userLng = pos.coords.longitude;
          saveState();
          updateMapLocationUI();
        },
        () => {},
        { enableHighAccuracy: false, timeout: 6000, maximumAge: 120000 }
      );
    }
  }
}

/* ================================================================
   地图视图
   ================================================================ */
function renderMapPins() {
  const wrap = $("mapPins");
  wrap.innerHTML = "";
  STORIES.forEach((s) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "map-pin";
    btn.textContent = "📍";
    btn.style.left = `${s.mapPin.x}%`;
    btn.style.top = `${s.mapPin.y}%`;
    btn.title = s.title;
    btn.dataset.id = s.id;
    btn.addEventListener("click", () => selectMapStory(s.id));
    wrap.appendChild(btn);
  });

  // 如果有定位，标记附近故事
  if (state.userLat != null) {
    const nearby = getNearbyStories(200);
    document.querySelectorAll(".map-pin").forEach((pin) => {
      const sid = pin.dataset.id;
      if (nearby.some((ns) => ns.id === sid)) {
        pin.classList.add("nearby");
      }
    });
  }
}

function selectMapStory(id) {
  state.mapSelectedId = id;
  const s = getStory(id);
  if (!s) return;

  document.querySelectorAll(".map-pin").forEach((p) => {
    p.classList.toggle("active", p.dataset.id === id);
  });

  const card = $("mapStoryCard");
  card.classList.remove("hidden");
  $("mapCardCover").style.backgroundImage = `url(${s.cover})`;
  $("mapCardTitle").textContent = s.title;
  $("mapCardLoc").textContent = s.spot;

  // 如果有距离信息，显示距离
  if (state.userLat != null && state.userLng != null) {
    const dist = calcDistance(state.userLat, state.userLng, s.lat, s.lng);
    $("mapCardLoc").textContent = `${s.spot} · 距你 ${formatDistance(dist)}`;
  }

  $("mapCardMood").textContent = s.mood;
  $("mapCardHook").textContent = s.hook;

  // 断点续播标签
  const progress = state.playbackProgress[id] || 0;
  const completed = state.playbackCompleted[id];
  if (completed) {
    $("mapCardPlayLabel").textContent = `重听 ${s.durationMin} 分钟`;
  } else if (progress > 10) {
    const remain = formatRemain(s.durationSec - progress);
    $("mapCardPlayLabel").textContent = `继续 ${s.durationMin} 分钟 · 剩余 ${remain}`;
  } else {
    $("mapCardPlayLabel").textContent = `播放 ${s.durationMin} 分钟`;
  }

  $("mapCardSave").classList.toggle("saved", state.favIds.includes(id));
  saveState();
}

function closeMapCard() {
  state.mapSelectedId = null;
  $("mapStoryCard").classList.add("hidden");
  document.querySelectorAll(".map-pin").forEach((p) => p.classList.remove("active"));
  saveState();
}

function tryMapSearchPreview() {
  const q = ($("mapSearchInput").value || "").trim();
  if (!q) {
    toast("请输入城市或景点关键词");
    return;
  }
  const cityHit = CITIES.find((c) => c !== "全部" && q.includes(c));
  if (cityHit && CITY_SUMMARY[cityHit]) {
    openPreviewForCity(cityHit);
    return;
  }
  const story = STORIES.find(
    (s) =>
      s.title.includes(q) || s.spot.includes(q) || s.city.includes(q)
  );
  if (story) {
    selectMapStory(story.id);
    setNav("map");
    toast("已定位到相关故事点");
    return;
  }
  toast("未找到匹配结果，试试「北京」「故宫」或故事名～");
}

/* ================================================================
   Feed 故事流
   ================================================================ */
function renderCityTags() {
  const host = $("cityTags");
  host.innerHTML = "";
  // 动态收集有故事的城市
  const activeCities = [...new Set(STORIES.map((s) => s.city))];
  const displayCities = ["全部", ...activeCities];

  displayCities.forEach((c) => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "city-tag" + (state.cityFilter === c ? " active" : "");
    b.textContent = c;
    b.addEventListener("click", () => {
      state.cityFilter = c;
      renderCityTags();
      renderFeed();
      saveState();
    });
    host.appendChild(b);
  });
}

function storyMatchesFilter(s) {
  if (state.cityFilter !== "全部" && s.city !== state.cityFilter) return false;
  const q = ($("feedSearchInput")?.value || "").trim().toLowerCase();
  if (!q) return true;
  return (
    s.title.toLowerCase().includes(q) ||
    s.spot.toLowerCase().includes(q) ||
    s.hook.toLowerCase().includes(q) ||
    s.city.toLowerCase().includes(q) ||
    s.mood.toLowerCase().includes(q) ||
    s.category.toLowerCase().includes(q)
  );
}

function renderFeed() {
  const list = $("feedList");
  list.innerHTML = "";
  const filtered = STORIES.filter(storyMatchesFilter);
  if (filtered.length === 0) {
    list.innerHTML =
      '<p class="empty-hint">暂无匹配故事，换个城市或关键词试试～</p>';
    return;
  }
  filtered.forEach((s) => {
    const card = document.createElement("article");
    card.className = "story-card-feed";
    const saved = state.favIds.includes(s.id);
    const progress = state.playbackProgress[s.id] || 0;
    const completed = state.playbackCompleted[s.id];
    const hasProgress = progress > 10 && !completed;

    card.innerHTML = `
      <div class="card-img" style="background-image:url(${s.cover})">
        <span class="story-badge">${s.category}</span>
        ${hasProgress ? '<span class="resume-badge" style="position:absolute;top:12px;left:12px;padding:4px 10px;border-radius:999px;background:rgba(46,196,182,.9);color:#fff;font-size:11px;font-weight:600;">⏯ 续播</span>' : ""}
        <p class="story-overlay-loc">${s.spot}</p>
        <h3 class="story-overlay-title">${s.title}</h3>
      </div>
      <div class="story-card-body">
        <div>
          <p class="story-card-hook">${s.hook}</p>
          <div class="story-card-meta">
            <span>🕐 ${s.durationMin} 分钟</span>
            <span>▶ ${s.plays} 次播放</span>
            <span class="mood-tag" style="display:inline-block;padding:2px 8px;border-radius:999px;background:linear-gradient(135deg,rgba(139,92,246,.12),rgba(255,107,138,.12));font-size:11px;color:var(--violet);">${s.mood}</span>
          </div>
        </div>
        <button type="button" class="btn-feed-save ${saved ? "saved" : ""}" data-save="${s.id}" aria-label="收藏">🔖</button>
      </div>
    `;
    card.querySelector(".card-img").addEventListener("click", () =>
      openPlayer(s.id)
    );
    card.querySelector(".btn-feed-save").addEventListener("click", (e) => {
      e.stopPropagation();
      toggleFav(s.id);
      renderFeed();
      renderMeStats();
      renderFavList();
    });
    list.appendChild(card);
  });
}

/* ================================================================
   我的（统计 / 行程 / 历史 / 收藏）
   ================================================================ */
function renderMeStats() {
  const listened = state.historyIds.length;
  const favs = state.favIds.length;
  const trips = state.tripIds.length > 0 ? 1 : 0;
  $("meStats").innerHTML = `
    <div class="me-stat"><span class="me-stat-val">${listened}</span><span class="me-stat-label">听过</span></div>
    <div class="me-stat"><span class="me-stat-val">${favs}</span><span class="me-stat-label">收藏</span></div>
    <div class="me-stat"><span class="me-stat-val">${trips}</span><span class="me-stat-label">行程</span></div>
  `;
}

function renderTripList() {
  const ul = $("tripStoryList");
  ul.innerHTML = "";
  if (state.tripIds.length === 0) {
    ul.innerHTML =
      '<li class="trip-empty"><span class="empty">还没有行程点，在播放页或地图卡片里点「加入行程」吧～</span></li>';
    $("aiRouteMeta").textContent = "添加行程点后自动生成";
    $("routeMapVisual").innerHTML =
      '<p style="margin:0;padding:40px 16px;text-align:center;color:#888;font-size:13px;">暂无路线示意</p>';
    return;
  }

  const items = state.tripIds
    .map((id) => getStory(id))
    .filter(Boolean)
    .map((s, i) => ({ ...s, order: i + 1 }));
  const fakeKm = (items.length * 2.8).toFixed(1);
  const fakeMin = Math.max(15, items.length * 18);
  $("aiRouteMeta").textContent =
    `总距离约 ${fakeKm} km · 预估步行 ${Math.round(fakeMin / 60)}h${fakeMin % 60}m（演示）`;

  const names = items.map((x) => x.spot.split(" · ").pop() || x.title);
  $("routeMapVisual").innerHTML = buildRouteSvg(names);

  items.forEach((s, i) => {
    const li = document.createElement("li");
    li.className = "trip-story-item";
    li.innerHTML = `
      <div class="thumb" style="background-image:url(${s.cover})">
        <span class="order">${i + 1}</span>
      </div>
      <div class="info">
        <h4>${s.title}</h4>
        <p class="meta">📍 ${s.spot} · ${s.durationMin} 分钟</p>
      </div>
      <span class="chev">›</span>
    `;
    li.addEventListener("click", () => openPlayer(s.id));
    ul.appendChild(li);
  });
}

function buildRouteSvg(labels) {
  const w = 100;
  const h = 100;
  const points = labels.map((_, i) => {
    const t = labels.length <= 1 ? 0.5 : i / (labels.length - 1);
    const x = 12 + t * 76 + Math.sin(i) * 6;
    const y = 78 - t * 58 + Math.cos(i * 0.8) * 8;
    return { x, y, label: labels[i] };
  });
  const d = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`)
    .join(" ");
  let nodes = "";
  points.forEach((p, i) => {
    nodes += `<span class="route-node" style="left:${p.x - 8}%;top:${p.y - 10}%;">${p.label}</span>`;
  });
  return `
    <svg class="route-path-svg" viewBox="0 0 ${w} ${h}" preserveAspectRatio="xMidYMid meet">
      <defs>
        <linearGradient id="routeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" style="stop-color:#ff7e47"/>
          <stop offset="50%" style="stop-color:#9b5de5"/>
          <stop offset="100%" style="stop-color:#2ec4b6"/>
        </linearGradient>
      </defs>
      <path d="${d}" fill="none" stroke="url(#routeGrad)" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
      ${points
        .map(
          (p) =>
            `<circle cx="${p.x}" cy="${p.y}" r="4" fill="#fff" stroke="#ff7e47" stroke-width="2"/>`
        )
        .join("")}
    </svg>
    ${nodes}
  `;
}

function renderHistoryList() {
  const ul = $("historyList");
  ul.innerHTML = "";
  if (state.historyIds.length === 0) {
    ul.innerHTML =
      '<li class="empty">还没有听过完整故事，去地图或发现页点播放吧～</li>';
    return;
  }
  state.historyIds.forEach((id) => {
    const s = getStory(id);
    if (!s) return;
    const completed = state.playbackCompleted[id];
    const li = document.createElement("li");
    li.innerHTML = `${completed ? "✅ " : "🎧 "}${s.title} · ${s.spot}`;
    li.addEventListener("click", () => openPlayer(s.id));
    ul.appendChild(li);
  });
}

function renderFavList() {
  const ul = $("favList");
  ul.innerHTML = "";
  if (state.favIds.length === 0) {
    ul.innerHTML =
      '<li class="empty">还没有收藏，在卡片上点书签即可～</li>';
    return;
  }
  state.favIds.forEach((id) => {
    const s = getStory(id);
    if (!s) return;
    const li = document.createElement("li");
    li.textContent = `${s.title} · ${s.mood}`;
    li.addEventListener("click", () => openPlayer(s.id));
    ul.appendChild(li);
  });
}

/* ================================================================
   状态操作
   ================================================================ */
function addToHistory(id) {
  state.historyIds = [id, ...state.historyIds.filter((x) => x !== id)].slice(
    0,
    50
  );
  renderHistoryList();
  renderMeStats();
  saveState();
}

function toggleFav(id) {
  if (state.favIds.includes(id)) {
    state.favIds = state.favIds.filter((x) => x !== id);
    toast("已取消收藏");
  } else {
    state.favIds.push(id);
    toast("已收藏");
  }
  renderFavList();
  renderMeStats();
  saveState();
}

function addToTrip(id) {
  if (state.tripIds.includes(id)) {
    toast("已在行程中");
    return;
  }
  state.tripIds.push(id);
  toast("已加入行程");
  renderTripList();
  renderMeStats();
  saveState();
}

/* ================================================================
   播放器（含断点续播）
   ================================================================ */
function openPlayer(id) {
  const s = getStory(id);
  if (!s) return;
  state.currentPlayId = id;
  addToHistory(id);

  const overlay = $("playerOverlay");
  overlay.classList.remove("hidden");
  overlay.setAttribute("aria-hidden", "false");

  $("playerBg").style.backgroundImage = `url(${s.cover})`;
  $("playerMood").textContent = s.mood;
  $("playerTitle").textContent = s.title;
  $("playerLoc").textContent = s.spot;
  $("playerHook").textContent = s.hook;
  $("sourceNote").textContent = `信源说明：${s.source}`;

  const audio = $("audioEl");
  audio.src = DEMO_AUDIO;
  audio.playbackRate = 1;

  // 断点续播
  const savedProgress = state.playbackProgress[id] || 0;
  const completed = state.playbackCompleted[id];
  if (completed) {
    // 已完播：从头开始
    audio.currentTime = 0;
  } else if (savedProgress > 5) {
    // 有进度且超过 5 秒：续播
    audio.currentTime = savedProgress;
    toast(`已从上次位置续播（剩余 ${formatRemain(s.durationSec - savedProgress)}）`);
  }

  const next = getNextRecommend(id);
  const nextHasProgress =
    state.playbackProgress[next.id] > 10 && !state.playbackCompleted[next.id];
  $("nextStoryBtn").textContent =
    `《${next.title}》· ${next.durationMin} 分钟 · 点选播放（不自动连播）` +
    (nextHasProgress ? " ⏯" : "");

  updateFavButtonState();
  bindSpeedButtons();

  audio.play().catch(() => {
    toast("点击下方音频控件开始播放");
  });
}

function updateFavButtonState() {
  const id = state.currentPlayId;
  const btn = $("btnToggleFav");
  if (!id || !btn) return;
  const on = state.favIds.includes(id);
  btn.textContent = on ? "已收藏" : "收藏";
}

function closePlayer() {
  // 关闭前保存播放进度
  _saveCurrentProgress();
  $("playerOverlay").classList.add("hidden");
  $("playerOverlay").setAttribute("aria-hidden", "true");
  const audio = $("audioEl");
  audio.pause();
  state.currentPlayId = null;
  saveState();

  // 刷新 Feed 以更新续播标签
  renderFeed();
}

function _saveCurrentProgress() {
  const id = state.currentPlayId;
  if (!id) return;
  const audio = $("audioEl");
  if (!audio.duration || !isFinite(audio.duration)) return;
  const s = getStory(id);
  if (!s) return;

  const current = audio.currentTime;
  state.playbackProgress[id] = current;

  // 完播判定：超过 90%
  if (current / audio.duration >= 0.9 || current >= s.durationSec * 0.9) {
    state.playbackCompleted[id] = true;
  }
  saveState();
}

function bindSpeedButtons() {
  const row = $("speedRow");
  const speeds = [0.5, 1, 1.5, 2];
  row.innerHTML = "";
  speeds.forEach((sp) => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "speed-btn" + (sp === 1 ? " active" : "");
    b.textContent = `${sp}x`;
    b.dataset.speed = String(sp);
    b.addEventListener("click", () => {
      row
        .querySelectorAll(".speed-btn")
        .forEach((x) => x.classList.remove("active"));
      b.classList.add("active");
      $("audioEl").playbackRate = sp;
    });
    row.appendChild(b);
  });
}

function bindAudioUi() {
  const audio = $("audioEl");
  const seek = $("seekBar");
  const timeRemaining = $("timeRemaining");

  audio.addEventListener("timeupdate", () => {
    if (!audio.duration) return;
    seek.value = String((audio.currentTime / audio.duration) * 100);
    const left = audio.duration - audio.currentTime;
    timeRemaining.textContent = `剩余 ${formatRemain(left)}`;

    // 实时保存进度（每 5 秒写一次存储）
    if (state.currentPlayId && Math.floor(audio.currentTime) % 5 === 0) {
      state.playbackProgress[state.currentPlayId] = audio.currentTime;
    }
  });

  audio.addEventListener("loadedmetadata", () => {
    const left = audio.duration - audio.currentTime;
    timeRemaining.textContent = `剩余 ${formatRemain(left)}`;
  });

  audio.addEventListener("ended", () => {
    if (state.currentPlayId) {
      state.playbackCompleted[state.currentPlayId] = true;
      state.playbackProgress[state.currentPlayId] = 0;
      saveState();
      toast("故事已听完，为你推荐下一个 👇");
    }
  });

  audio.addEventListener("pause", () => {
    _saveCurrentProgress();
  });

  // 页面卸载前保存进度
  window.addEventListener("beforeunload", () => {
    _saveCurrentProgress();
  });

  // 定期保存
  setInterval(() => {
    if (state.currentPlayId && !audio.paused) {
      _saveCurrentProgress();
    }
  }, 10000);

  seek.addEventListener("input", () => {
    if (!audio.duration) return;
    audio.currentTime = (Number(seek.value) / 100) * audio.duration;
  });
}

function randomListen() {
  const s = STORIES[Math.floor(Math.random() * STORIES.length)];
  openPlayer(s.id);
  toast("随机为你选了一段故事");
}

/* ================================================================
   行前预览 Sheet
   ================================================================ */
let lastPreviewCity = null;

function openPreviewForCity(city) {
  const info = CITY_SUMMARY[city];
  if (!info) return;
  lastPreviewCity = city;
  $("previewCityTitle").textContent = `${city} · 行前速览`;
  $("previewOneLiner").textContent = info.oneLiner;
  const stats = $("previewStats");
  stats.innerHTML = info.stats
    .map((x) => `<span class="preview-stat-pill">${x.label} ${x.value}</span>`)
    .join("");

  const picks = STORIES.filter((s) => s.city === city).slice(0, 4);
  const ul = $("previewPicks");
  ul.innerHTML = picks
    .map(
      (s) =>
        `<li><strong>${s.title}</strong> · ${s.durationMin} 分钟 · <span style="color:var(--violet);font-weight:600;">${s.mood}</span></li>`
    )
    .join("");

  $("previewSheet").classList.remove("hidden");
  $("sheetScrim").classList.remove("hidden");
}

function closePreview() {
  $("previewSheet").classList.add("hidden");
  $("sheetScrim").classList.add("hidden");
}

/* ================================================================
   登录
   ================================================================ */
function bindLogin() {
  if (state.loginDismissed) {
    $("loginOverlay").classList.add("hidden");
  }

  let codeSent = false;

  const hide = () => {
    $("loginOverlay").classList.add("hidden");
    state.loginDismissed = true;
    saveState();
  };

  const isValidPhone = (phone) => /^1\d{10}$/.test(phone);

  $("loginGetCode").addEventListener("click", () => {
    const phone = ($("loginPhoneInput").value || "").trim();
    if (!isValidPhone(phone)) {
      toast("请输入正确的 11 位手机号");
      return;
    }
    if (!codeSent) {
      codeSent = true;
      $("loginCodeRow").classList.remove("hidden");
      $("loginGetCode").textContent = "登录";
      toast("验证码已发送（演示：输入任意 6 位）");
      $("loginCodeInput").focus();
      return;
    }
    const code = ($("loginCodeInput").value || "").trim();
    if (code.length < 4) {
      toast("请输入验证码");
      return;
    }
    hide();
    toast("登录成功，欢迎回来 ✨");
  });

  $("loginWechat").addEventListener("click", () => {
    hide();
    toast("微信登录成功");
  });

  $("loginSkip").addEventListener("click", hide);
}

/* ================================================================
   我的 Tab 切换
   ================================================================ */
function bindMeTabs() {
  const panelSuffix = { trip: "Trip", history: "History", fav: "Fav" };
  document.querySelectorAll(".me-tab").forEach((tab) => {
    tab.addEventListener("click", () => {
      const name = tab.dataset.meTab;
      document
        .querySelectorAll(".me-tab")
        .forEach((t) => t.classList.remove("active"));
      document
        .querySelectorAll(".me-tab-panel")
        .forEach((p) => p.classList.remove("active"));
      tab.classList.add("active");
      const suffix = panelSuffix[name];
      if (suffix) $(`meContent${suffix}`).classList.add("active");
    });
  });
}

/* ================================================================
   隐私权限处理
   ================================================================ */
function showPrivacyNotice() {
  // 仅在首次且未跳过登录时展示
  if (state.loginDismissed) return;
  // 隐私说明以轻量 toast 展示
  setTimeout(() => {
    toast("🔒 位置信息仅用于匹配附近故事，不会上传服务器（演示）");
  }, 2000);
}

/* ================================================================
   初始化
   ================================================================ */
function init() {
  // 恢复持久化的 UI 状态
  if (state.loginDismissed) {
    $("loginOverlay").classList.add("hidden");
  }

  renderMapPins();
  renderCityTags();
  renderFeed();
  renderMeStats();
  renderTripList();
  renderHistoryList();
  renderFavList();

  // 恢复地图选中状态
  if (state.mapSelectedId) {
    selectMapStory(state.mapSelectedId);
  }

  // 地图事件
  $("mapCardClose").addEventListener("click", closeMapCard);
  $("mapCardPlay").addEventListener("click", () => {
    if (state.mapSelectedId) openPlayer(state.mapSelectedId);
  });
  $("mapCardSave").addEventListener("click", () => {
    if (state.mapSelectedId) {
      toggleFav(state.mapSelectedId);
      $("mapCardSave").classList.toggle(
        "saved",
        state.favIds.includes(state.mapSelectedId)
      );
    }
  });

  $("mapSearchInput").addEventListener("keydown", (e) => {
    if (e.key === "Enter") tryMapSearchPreview();
  });

  // 地图上添加定位按钮
  const mapStage = $("mapStage");
  const locateBtn = document.createElement("button");
  locateBtn.type = "button";
  locateBtn.style.cssText =
    "position:absolute;bottom:40px;right:12px;z-index:4;" +
    "width:44px;height:44px;border-radius:50%;" +
    "background:var(--gradient-brand);color:#fff;font-size:18px;" +
    "border:3px solid #fff;box-shadow:0 4px 16px rgba(139,92,246,.4);" +
    "display:flex;align-items:center;justify-content:center;";
  locateBtn.textContent = "⊙";
  locateBtn.title = "定位当前位置";
  locateBtn.addEventListener("click", requestUserLocation);
  mapStage.appendChild(locateBtn);

  // 播放器事件
  $("playerClose").addEventListener("click", closePlayer);
  $("btnAddTrip").addEventListener("click", () => {
    if (state.currentPlayId) addToTrip(state.currentPlayId);
  });
  $("btnToggleFav").addEventListener("click", () => {
    if (state.currentPlayId) {
      toggleFav(state.currentPlayId);
      updateFavButtonState();
    }
  });
  $("nextStoryBtn").addEventListener("click", () => {
    if (!state.currentPlayId) return;
    const next = getNextRecommend(state.currentPlayId);
    openPlayer(next.id);
  });
  $("btnReport").addEventListener("click", () => {
    toast("感谢反馈！正式版将跳转纠错表单（演示）");
  });

  // Feed 事件
  $("btnRandomListen").addEventListener("click", randomListen);
  $("feedSearchToggle").addEventListener("click", () => {
    state.feedSearchOpen = !state.feedSearchOpen;
    $("feedSearchBar").classList.toggle("hidden", !state.feedSearchOpen);
    if (state.feedSearchOpen) {
      setTimeout(() => $("feedSearchInput").focus(), 100);
    }
  });
  $("feedSearchInput").addEventListener("input", () => renderFeed());

  // 预览事件
  $("previewStart").addEventListener("click", () => {
    closePreview();
    if (lastPreviewCity) {
      state.cityFilter = lastPreviewCity;
      renderCityTags();
      renderFeed();
      saveState();
    }
    setNav("feed");
    toast("已切换到故事流，可按城市筛选");
  });
  $("sheetScrim").addEventListener("click", closePreview);

  bindNav();
  bindMeTabs();
  bindLogin();
  bindAudioUi();

  // 全局键盘事件
  document.addEventListener("keydown", (e) => {
    if (
      e.key === "Escape" &&
      !$("playerOverlay").classList.contains("hidden")
    ) {
      closePlayer();
    }
  });

  // 初始化定位
  initGeolocation();

  // 隐私说明（延迟展示）
  showPrivacyNotice();

  // 恢复上次播放内容提示
  if (state.currentPlayId && state.playbackProgress[state.currentPlayId] > 10) {
    const s = getStory(state.currentPlayId);
    if (s) {
      setTimeout(() => {
        toast(`💡 上次听过《${s.title}》，打开即可续播`);
      }, 3000);
    }
  }
}

init();
