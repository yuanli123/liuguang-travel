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
   音频：使用浏览器语音合成（TTS）逐句朗读每个故事的 script 字段，
   引擎实现在下方「播放器」一节。
   ================================================================ */

/* ================================================================
   城市 / 标签
   ================================================================ */
const CITIES = ["全部", "北京", "上海", "杭州", "苏州", "成都", "西安", "南京", "厦门"];

/* ================================================================
   故事数据（lat/lng 为真实景区坐标）
   ================================================================ */
const BUILTIN_STORIES = [
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
    script:
      "这里是颐和园，昆明湖。很多人以为，它的名字和云南的昆明有关。其实，它致敬的是更古老的汉代。\n汉武帝当年为了操练水军，在长安城外开凿了一片人工湖，取名昆明池。两千年后，乾隆皇帝仿照昆明池的格局，在北京城西，造出了这片同样名字的水面。\n现在，请你想象清晨六点的湖边。雾气还没有散，水面像一块正在呼吸的丝绸，一起，一伏。\n老北京人有个说法：昆明湖是有呼吸的。那不是风，是水在安慰每一个靠近它的人。\n传说很久以前，湖边住着一位常年失眠的书生。他试过很多办法，都没有用。直到有一天，他听见了湖水的节奏，一吸一呼，安稳得像母亲的手。他把这个节奏写进了一首琴曲，名字叫《水之息》。后来听过这首曲子的人都说，那一夜，睡得特别沉。\n传说是真是假，已经不重要了。现代科学倒是给出了一个有趣的解释：水波的规律起伏，会让人的呼吸不知不觉跟它同步。呼吸慢了，心率缓了，焦虑也就慢慢退潮。\n所以，下一次你站在这里，不妨闭上眼睛，听上三十秒。让湖水的呼吸，带着你的呼吸。\n对了，如果是在冬至前后，你还能在十七孔桥看到著名的金光穿洞——夕阳刚好穿过十七个桥孔，把整个湖面点亮。那一刻，你会明白：这座湖收藏的，不只是一个王朝的黄昏，还有一份可以随时取用的平静。",
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
    script:
      "这是公元1924年11月5日，紫禁城的最后一个清晨。\n前一天夜里，北京城落了一场薄霜。宫墙上的琉璃瓦，在晨光里闪着冷光，像无数片凝固的鱼鳞。\n没有人知道，这座城的主人，即将在今天告别它。\n十六岁的溥仪刚刚用过早点，消息就到了：冯玉祥的部队，已经包围了皇宫。\n上午九点，国民军的鹿钟麟带着士兵从神武门进来，在内务府大臣绍英面前，宣读了修改后的清室优待条件。没有商量，只有通知：清室全体人员，必须在三个小时之内，离开紫禁城。\n溥仪后来在回忆录里写道，绍英听到这个通知，先是呆住，然后两条腿一软，差点坐到地上。他拿着那份文件，双手抖得像秋风里的叶子。\n消息传开后，整个皇宫乱作一团。太监宫女们慌慌张张收拾细软，有人把珍珠缝进衣襟，有人跪在佛像前磕头，有人抱着铺盖卷，站在宫墙下不知道往哪走。\n宫里的档案和文物，由专门的委员会清点封存。士兵们守在每一道宫门口，出入都要搜身。据说，有个太监想夹带一件瓷器出宫，被当场拦住，瓷瓶摔在地上，碎成一片。\n而在这几个小时里，溥仪一直在养心殿里走来走去。他后来回忆，自己当时最担心的，是出了宫以后，还能不能继续念书。\n他的老师庄士敦，一位英国绅士，劝他说：陛下，去外面的世界看看吧。\n下午四点，溥仪坐上国民军准备的汽车，出了神武门。出发前，鹿钟麟问他：从今天起，你是愿意做皇帝，还是愿意做平民？\n溥仪说：从今天起，我做平民。\n车队缓缓驶过景山。崇祯皇帝当年，就是在那里的槐树上自缢的。两百八十年前，一个王朝在那里落幕；两百八十年后，同一个王朝，在这里画上了最后一个句号。\n当身后的宫门一扇扇关上，这座六百年历史的皇宫，从此再没有了皇帝。\n有意思的是，那一夜，北京城安静得出奇。没有炮火，没有厮杀，只有秋天的风，扫过九千多间宫殿的屋檐。\n紫禁城见过二十四位皇帝，见过无数个决定中国命运的夜晚。而它自己经历的最后一天，却安静得，像一场大雪，慢慢落下来。\n第二天，《大公报》的标题只有几个字：溥仪出宫。\n一个时代，就此翻页。",
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
    script:
      "傍晚的外滩，江风微凉。对岸的霓虹灯次第亮起，像一场永不落幕的烟火。\n突然，海关大楼的钟声敲响了。\n每个整点，这钟声都会准时响起。钟楼是1927年落成的，四面大钟的机芯，从英国漂洋过海而来，重达六吨。钟声一响，能传出好几公里。当年的外滩人，就靠它校准时间。\n但很少有人知道，在钟声背后，藏着一条街的欲望、财富，和一个时代的秘密。\n十九世纪四十年代开埠之后，黄浦江边这片滩涂，成了各国商人争夺的舞台。英国人来了，法国人来了，后来，犹太商人沙逊，也来了。\n沙逊家族把生意重心从印度迁到上海，盖起了当时远东最豪华的饭店，沙逊大厦，也就是今天的和平饭店。传说沙逊站在顶楼的窗前，说过一句话：在这里，我可以看见整条江上的钱在流动。\n那时的外滩，被称作冒险家的乐园。有人一夜暴富，也有人输光一切之后，从苏州河边，无声无息地消失。\n汇丰银行大楼门前的铜狮子，见过最惊心动魄的一场风浪。1921年前后，上海的橡胶股票风波爆发，无数人的积蓄一夜蒸发。跳楼的传闻，在弄堂里传了整整一个冬天。\n还有一个人，叫哈同。他刚到上海时，只是一个看门人。后来靠着租界里的地产生意，成为上海滩最富有的人之一。他死后，一场遗产官司打了十六年，被称作远东最大的遗产纠纷。\n钱能造楼，也能埋人。外滩的每一块花岗岩里，都压着赢家和输家的名字。\n1937年，日军逼近上海。外滩的钟声，第一次带上了战争的阴影。江面上炮舰来来往往，钟楼依然每天报时，像在提醒这座城市：时间不停，故事就不会停。\n1949年之后，银行大楼一栋栋换了招牌，建筑却留了下来。\n今天，当你站在外滩，听钟声响起，江风会把一百年前的喧嚣，轻轻吹进你的耳朵。\n和平饭店里，有一支老爵士乐队，从1930年代一直演到今天。白发苍苍的乐手们，还会演奏《夜上海》和《玫瑰玫瑰我爱你》。他们说，只要乐队还在，旧上海就没有散场。\n那些石库门里藏过的秘密，那些签字笔落下的交易，那些再也没有回来的人，都化作了黄浦江的波光。\n钟声每响一次，就有一层旧上海，从水面下，慢慢浮上来。",
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
    script:
      "杭州人常说：断桥不断，孤山不孤，长桥不长。这三句，说的是西湖边最著名的三个误会。\n断桥，其实是白堤和陆地相连的一座石桥。它从来没有断过。\n那为什么叫断桥？比较可信的说法是，这座桥最早叫段家桥，后来叫顺了口，成了断桥。冬天雪后，桥面的雪先化，远远望去，桥像是断在湖光里——断桥残雪，也就成了西湖十景之一。\n当然，真正让断桥家喻户晓的，是白娘子和许仙的故事。\n传说一千多年前，修炼千年的白蛇化作女子，在断桥边，遇见了书生许仙。一场雨，一把伞，一段姻缘。后来法海介入，水漫金山，白娘子被压在雷峰塔下。\n故事到这里，是个悲剧。但杭州人给它留了一个温柔的尾巴：多年后，白娘子重获自由，与许仙在断桥重逢。\n断桥，成了这段爱情里，离别和重逢的同一个坐标。\n所以当地人说，站在断桥上，别急着走。也许桥下某片波光，就是几百年前那把伞的影子。\n1990年代，电视剧《新白娘子传奇》热播，断桥成了全国闻名的爱情地标。每年春天，都有情侣专程来桥上合影，想象自己是那一年的许仙和白娘子。\n1999年，倒塌多年的雷峰塔开始重建。新塔落成那天，很多老人望着塔顶说：白娘子终于不用再压在地下了。\n传说会老，会变，会跟着每一代人的心事重新生长。而断桥，始终在那里。\n有趣的是，西湖的传说大多有一个共同点：无论过程多么曲折，故事的落点，永远是人心相连。\n苏轼在这里修过堤，白居易在这里写下诗篇。千百年来，无数失意的人来到湖边，又被湖水治愈。\n断桥从来没有断过，就像人心，在最冷的时候，也会留出一小块温暖的地方。\n下次来西湖，记得在断桥上站一会儿。你站的地方，曾经有一场雨，淋湿了两个愿意为彼此撑伞的人。",
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
    script:
      "苏州人把逛园林，叫做孵园子。一个孵字，是江南特有的耐心。\n拙政园，是苏州园林里最大的一座。它建于明代正德年间，距今五百多年。\n园子的第一任主人，叫王献臣。他做过御史，因为性情刚直，得罪了权贵，被贬官回家。\n回到苏州的王献臣，没有消沉。他把半生积蓄，全部投进了一块荒地，请来好友、大才子文徵明，一起设计。\n于是，中国园林史上最温柔的一次报复，开始了。\n文徵明为园子画了三十一幅图，写了记。他们在方寸之间，搬进山，引进水，种下四季。\n走进拙政园，你会发现一个秘密：这里几乎没有一条路是直的。\n曲折的回廊，错落的假山，一步一景。每走几步，眼前的画面就换一次。\n这不是随意为之。造园的人相信，直路会让人的心也直来直去，而曲折，能让时间慢下来。\n你在园子里绕一个弯，焦虑，就跟不上你的脚步了。\n再看那些窗。拙政园的漏窗，有冰裂纹，有梅花纹，有海棠纹。每一扇窗，都是一幅会呼吸的画。\n透过窗看出去，远处的北寺塔，其实是园外三百米的建筑。造园者把它借了进来，成为园中一景。这个手法，叫借景。\n借别人的风景，补自己的画。这大概是古人最豁达的生活哲学：世界很大，但属于你的画面，可以自己框定。\n园里有个小轩，叫听雨轩。名字直白得可爱——它就是用来听雨的。古人专门留一间屋子，给雨天。\n还有一座亭子，叫与谁同坐轩。取自苏轼的词：与谁同坐？明月清风我。\n五百年前，文徵明在园里亲手种下一棵紫藤。今天，那棵紫藤还活着，每年四月，花开如瀑布。\n所以有人说，拙政园是一个活着的时间胶囊。你摸到的那片墙，可能听过明代的风；你走过的石阶，被三十代主人踩过。\n拙政园五百年间，换了三十多位主人。有人在这里大宴宾客，有人在战乱中仓皇离去。园子像一位沉默的老人，看过荣华，也看过破碎。\n抗战时期，园子一度荒废，野草长到半人高。\n新中国成立后，拙政园被修复，重新开放。\n今天的游人，依然能在水边的石凳上，坐一个下午。\n为什么一座园林，能治愈几百年间的人？\n也许是因为，它把焦虑这件事，认真地折叠了起来。折叠进回廊的转角，折叠进漏窗的花纹，折叠进一池倒影。\n在园子里，时间是可以折叠的。五百年前的一阵风，和今天的风，吹过的是同一片荷叶。\n下次觉得累的时候，不妨去孵一次园子。不用赶路，不用打卡。\n就坐在水边，看鱼，听风，让时间，从你身边，慢慢走过去。",
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
    script:
      "请先停一下，闭上眼睛，听。\n听见了吗？那阵风，已经在砖缝里，吹了两千年。\n你现在站的地方，是八达岭长城。它是明代长城的精华段，建在燕山山脉的军都山上，海拔一千多米。\n先说地质。燕山山脉，是一条古老的造山带。亿万年前，地壳挤压，把海底的岩层抬成了山。山上的石头，主要是坚硬的花岗岩。\n明代修筑长城的人，很懂这些石头。他们在山脊上就地取材，用花岗岩条石打地基，再在上面砌青砖。\n条石有多重？一块能有一吨。当年没有起重机，人们用杠子、滚木，一点点把石头运上山。\n青砖又是怎么来的？在山脚下烧制。砖窑的炉火，昼夜不熄。烧好的砖，背面常常刻着产地和工匠的名字，某某卫，某某年造。\n这不只是追责，更是一种最古老的承诺：每一块砖，都有人为它负责。\n再听这风。\n八达岭地处山口，风从北面草原吹来，四季不停。当地人说，这里的风，冬天像刀子，夏天像鞭子。\n长城，就是为这样的风而生的。它把风拦住，也把北方的骑兵拦住。\n但长城的故事，要比明代早得多。\n公元前三世纪，秦始皇把战国时期各国零散的长城连成一体，动用了数十万民夫。孟姜女哭长城的传说，说的就是这段历史——一个王朝的雄图，压在无数普通人肩头。\n汉朝，长城向西延伸，一直修到敦煌以西。丝绸之路上的驼队，就是沿着长城的烽火台，找到回家的方向。\n到了明代，蒙古骑兵依然威胁北方。明朝用了将近两百年，重修长城，设置九边重镇。八达岭，就是其中最险要的关口之一，号称居庸外镇。\n有个细节很有意思：烽火台。白天放烟叫燧，夜里点火叫烽。一里一墩，十里一堡。敌人一来，烟火接力传递，几个时辰，军情就能传到京城。\n这是古代中国最发达的通信系统，光速的烟火版。\n再看这些砖。有的砖上，至今能看到烧制时的指纹。不是传说，是真的。\n六百年前的某个下午，一个工匠把湿砖坯放进窑里。他的指纹留在了砖上，也留进了历史。\n长城上到底死过多少人？史书没有准确数字。但每一段城墙下面，都埋着数字以外的东西：名字、故乡、再也没有吃到的团圆饭。\n所以，当你抚摸这些砖的时候，摸到的，不只是冷冰冰的石头。\n是两千年来的风，是千万个人的命，是一个民族，把防御写在大地上的决心。\n1909年，京张铁路从长城脚下穿过。詹天佑在青龙桥设计了人字形铁路，火车爬坡的那个弯，成了中国工程史上的著名一笔。\n而长城，也从一个防御工事，慢慢变成一个象征。\n不到长城非好汉。这句话，说的从来不是爬山，而是爬过自己心里的那道坎。\n现在，请再听一次风。\n它吹过烽火台的豁口，吹过砖上的指纹，吹过你的耳边。\n这阵风里，有秦朝的号子，有汉代的驼铃，有明朝的梆子声。\n长城从不说话。\n但风，替它说了一切。",
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
    script:
      "成都的宽窄巷子，其实有三条巷子：宽巷子、窄巷子、井巷子。\n很多人不知道，它们的根，在三百年前的军营。\n1718年，康熙皇帝派兵平定准噶尔之乱后，在成都驻防。旗人在少城一带修起营房。宽巷子住的是军官，窄巷子住的是士兵。宽窄之分，是当年的等级，也是今天的风景。\n辛亥革命之后，满城被拆，只有这几条巷子，意外地留了下来。\n留下来的，还有成都人的生活方式。\n成都人喝茶，不叫喝茶，叫泡茶馆。一个泡字，讲究的是时间。\n宽窄巷子的茶馆里，最常见的是一碗盖碗茶。盖为天，托为地，碗为人。三件一套，天地人，都握在手里。\n茶博士拎着长嘴铜壶，隔着两米远，把开水稳稳地冲进碗里，一滴不洒。这是成都茶馆里的功夫，也是成都人的从容。\n成都人泡茶馆，一坐就是半天。摆龙门阵，掏耳朵，看变脸，或者干脆什么都不做，就看着茶叶在碗里慢慢沉下去。\n外地人问：你们不用上班吗？\n成都人笑着说：着急啥子嘛，事情是做不完的，茶是要趁热喝的。\n这句话，就是宽窄巷子的密码。\n宽窄巷子的改造，是2008年完成的。修旧如旧，青砖灰瓦，院落连着院落。\n改造之后，有人担心它太商业化。但巷子深处，那些老院子的门楣上，依然刻着福禄寿喜，门槛被磨得发亮。\n老成都人路过，还是会停下来，说一句：我小时候，就是在这个院子里捉迷藏的。\n这就是宽窄巷子的妙处：宽，是给世界的；窄，是留给自己的。\n世界再大，日子再忙，一碗茶的功夫，总还是有的。\n下次来成都，别急着拍照。找一家茶馆坐下来，点一碗盖碗茶。\n等茶叶沉底的那一刻，你就读懂了这座城市，三千年的慢。",
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
    script:
      "1974年春天，西安临潼，西杨村的几个农民在打井。\n挖到三四米深的时候，杨志发的锄头，碰到了一个坚硬的物体。他拨开泥土，一张泥土烧制的面孔，正看着他。\n那是一张两千两百年前的脸。\n消息层层上报。考古队来了，然后，是世界各地的目光。\n秦始皇陵兵马俑，就这样从地下，重新站了起来。\n这个地下军团有多大？已经出土的俑，有八千多件。步兵、骑兵、弓箭手、战车兵，排列成一个个方阵，面向东方。\n他们守的，是秦始皇的陵墓。\n有意思的是，八千张面孔，没有两张完全相同。\n有的皱眉，有的抿嘴，有的眼神坚毅，有的带着一丝疲惫。考古学家说，当年制作这些陶俑的工匠，很可能就是照着身边的士兵，一张脸一张脸地捏。\n更惊人的，是两千年前的工匠，如何在每件作品上留下责任。\n秦朝的法律规定，器物上要刻工匠的名字，叫做物勒工名。兵马俑的衣角、铠甲、甚至脚底，都刻着制作者的名字。\n做坏了怎么办？按律处罚。所以每一件作品，都是一个普通人的命运担保。\n这是秦朝留给后世，最硬核的质量管理体系。\n再仔细看，这些俑的手里，曾经都握着真正的兵器。\n青铜剑、弩机、长矛。坑里出土的青铜剑，两千多年不锈。检测发现，剑的表面有一层极薄的铬盐氧化层。这个工艺，西方到二十世纪才掌握。\n所以，秦朝不是只有暴政。它是一个把标准化做到极致的时代。车同轨，书同文，度量衡统一——一个帝国，像一台精密的机器。\n而这台机器的发动机，是无数沉默的普通人。\n修筑陵墓的工匠，很多再也没有回到家乡。史书记载，秦始皇征发七十万人修陵。他们中的许多人，就留在了骊山脚下。\n还有一个令人唏嘘的细节：这些俑出土时，身上是有颜色的。\n红的脸颊，黑的铠甲，绿的衣摆。但颜料一见空气，几分钟内就剥落了。\n我们今天看到的灰扑扑的军团，其实只是它褪色后的样子。\n修复一尊俑，往往要几个月。八千尊，是几代人的时间。\n所以，当你站在一号坑前，看到这支沉默的军团，你看到的不只是秦始皇的野心。\n你看到的，是两千两百年前，一群没有留下名字的人，用一生的力气，留下了这个星球上最壮观的，沉默。\n今天，考古工作还在继续。陵墓的核心区，至今没有打开。\n史书记载，地宫里以水银为百川江河大海，机关重重。现代勘探发现，陵区土壤的汞含量，确实异常偏高。\n传说，也许不只是传说。\n兵马俑只是一座冰山。真正的谜底，还在地下，等着下一个春天。",
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
    script:
      "夜晚的秦淮河，桨声灯影。\n很多人对秦淮河的第一印象，来自朱自清和俞平伯同题的那篇散文，《桨声灯影里的秦淮河》。\n1923年的夏天，两个年轻人在灯影里泛舟。河上歌女摇着橹，问他们要不要听歌。他们拒绝了，又在文章里，为这个拒绝，辗转反侧。\n那是旧文人的秦淮。而秦淮河的故事，要比他们想象的，深得多。\n秦淮河全长一百多公里，穿南京城而过。古代南京的繁华，一半在这条河上。\n六朝时期，秦淮两岸是豪门贵族的聚居地。王导、谢安，这些让后世羡慕了一千年的名字，就住在河边。\n朱雀桥边野草花，乌衣巷口夕阳斜。刘禹锡写这首诗时，六朝已经远去了。但秦淮河，还在。\n到了明代，秦淮河变成了另一番景象。\n江南贡院就建在河边。科举考试期间，成千上万的读书人涌进南京。河房里，灯影彻夜不灭。\n于是，秦淮八艳登场了。\n她们不是普通的歌女。李香君、柳如是、董小宛，个个能诗会画，通晓音律。\n李香君的故事，最有名。\n明末，清兵南下，国破家亡。有阉党余孽想逼迫李香君嫁给权贵。她把定情信物，一把扇子，摔在地上，血溅桃花。\n后来，人们把那把扇子上的血迹，画成了一枝桃花。这就是《桃花扇》的由来。\n一个乱世里的女子，用一腔热血，守住了自己的选择。\n秦淮河的波光里，藏着这样的刚烈。\n但波光之下，还有更神秘的传说。\n南京，古称金陵。风水先生说，这里王气太重，所以从秦始皇开始，历代都有人设法镇压。传说秦始皇凿开秦淮河，就是为了泄掉金陵王气。\n所以，秦淮河从一开始，就带着一股被压抑的、不甘心的力量。\n也许正因如此，南京的故事，总是悲欣交集。\n建都于此的王朝，大多短命。但每一次，这座城市都能从废墟里重新站起来。\n今天的秦淮河，游船依然来来往往。夫子庙的灯，把河面染成一片流动的金红。\n如果你在夜晚来到河边，不妨找一条小船，听一听桨声。\n那桨声里，有王谢堂前的燕子，有香君扇上的桃花，有六朝金粉，也有今天的万家灯火。\n秦淮河，从来不是一条简单的河。\n它的波光，一半是诗，一半是血，还有一半，是这座城，不肯熄灭的灯。",
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
    script:
      "请想象这样一个画面：雪山下，一条江咆哮着冲出山口。雨季，它吞没村庄；旱季，它露出龟裂的河床。\n这就是两千两百多年前的岷江。\n它从雪山奔流而下，冲出山口后，流速骤降，泥沙淤积。雨季一到，洪水四溢；旱季一来，赤地千里。\n公元前256年，秦国蜀郡太守李冰，带着他的儿子，来到了这里。\n他没有修大坝。\n这个决定，让都江堰成为了水利史上独一无二的存在。\n李冰的办法，是把江水分开。\n他在江心修了一道分水堤，形状像鱼的嘴巴，所以叫鱼嘴。岷江在这里，被分成两股：外江，继续流走；内江，流进灌溉渠。\n内江经过一个叫飞沙堰的低坝。水大了，多余的洪水和泥沙，会从堰上翻过去，排进外江。\n最后，水流进宝瓶口。这是一段人工开凿的狭窄口子，宽只有二十米。就像给整条江，装了一个水龙头。\n于是，四六分水，二八分沙。枯水期，六成的水进内江灌溉；洪水期，六成的水走外江泄洪。\n没有闸门，没有大坝，江水自己，就会做正确的事。\n这就是无坝引水。\n它靠的不是对抗，而是顺从。\n李冰没有试图征服岷江。他读懂了江的性格，然后，轻轻引导了一下。\n宝瓶口，是整座工程最硬核的部分。\n当年没有炸药，怎么在坚硬的山岩上，凿出二十米宽的口子？\n古人的办法，是烈火水激。先用火烧岩石，再浇冷水，热胀冷缩，岩石一层层崩裂。\n就这么，一寸一寸，凿了很多年。\n后世给这套办法起了个名字，叫积薪烧岩。\n修成都江堰之后，成都平原成了天府之国。旱涝保收，沃野千里。\n秦始皇能统一六国，很大程度，靠的是这座粮仓。\n而都江堰，一直用到了今天。\n2000年，它被列入世界文化遗产。专家们说，这是全世界年代最久、唯一留存、至今仍在使用的无坝引水工程。\n两千两百多年了。\n鱼嘴依然在分水，飞沙堰依然在排沙，宝瓶口依然在控流。\n2008年汶川地震，都江堰离震中很近，鱼嘴出现了裂缝。但主体结构，稳如磐石。\n当地人说，李冰没有走。他还站在江边，看着这条江。\n所以，当你站在都江堰前，看到江水安静地流进平原，请记住：这不是一条被征服的江。\n这是一条，被读懂的江。\n两千年前的古人，用最温柔的方式，和最狂暴的自然，达成了和解。\n这，就是水的千年智慧。",
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
    script:
      "公元627年，一个和尚，从长安出发，向西而去。\n他叫玄奘。\n官方没有批准他的出境申请。他是混在逃荒的人群里，偷渡出去的。\n那时候，他不知道，这一走，就是十七年。\n从长安到天竺，也就是今天的印度，五万里路。玄奘穿越沙漠，翻过雪山，途经一百多个国家。\n在莫贺延碛，他打翻了水囊。四天五夜，滴水未进。他想过回头，最后还是决定：宁可西行而死，决不东归而生。\n他活着到了天竺。\n在天竺最高学府那烂陀寺，玄奘留学五年，成为全印度闻名的大学者。\n国王想留他，许他富贵。\n他谢绝了。他带着六百五十七部佛经，踏上了回家的路。\n公元645年，玄奘回到长安。\n长安万人空巷，人们挤在朱雀大街上，只为看一眼这位取经归来的僧人。\n唐太宗接见了他，还建议他还俗做官。\n玄奘说，不，我要译经。\n于是，他在长安的大慈恩寺，建了一座塔，用来存放带回来的经书。\n这座塔，就是大雁塔。\n为什么叫大雁塔？\n有一个流传很广的说法：在印度，有一座塔，因为埋藏过大雁，被称为雁塔。大雁，是佛教里舍身布施的象征。玄奘为了纪念和致敬，就把自己的塔，也叫作雁塔。\n后来的故事，我们都知道了。\n几百年后，一个叫吴承恩的人，以玄奘为原型，写下了《西游记》。\n真实的玄奘，没有神通广大的徒弟。他有的，只是一个人，一盏灯，一颗不肯回头的心。\n他用十九年时间，翻译了一千三百多卷佛经，占唐代译经总量的一半以上。\n公元664年，玄奘圆寂。送葬那天，长安城的街道，站满了人。\n大雁塔，至今还立在西安。\n塔下，是今天熙熙攘攘的广场。音乐喷泉，游人如织。\n但如果你在清晨来到这里，太阳刚刚升起，塔的影子长长地投在地上。\n那一刻，你会相信：一千三百多年前，那个背着经书走过沙漠的人，\n真的，从这里，出发过。",
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
    script:
      "一座只有一点八平方公里的小岛，走出了中国最密集的音乐家。\n这是鼓浪屿。\n1840年代之后，厦门开埠，鼓浪屿成了公共租界。西方人来了，带来教堂，带来学校，也带来了钢琴。\n钢琴一上岸，就再也没有离开。\n二十世纪初，鼓浪屿几乎家家有琴。鼎盛时期，岛上的钢琴有五百多台，密度全国第一。\n傍晚的时候，走在巷子里，你会听见琴声从不同的窗口漏出来，东一句，西一句，像一场没有指挥的音乐会。\n岛上有一所音乐学校，培养出殷承宗、许斐平这样世界级的音乐家。\n一个弹钢琴的岛上孩子，走过邻居家门口，听见一段指法不对的练习曲，会忍不住敲门进去，说：这一段，应该这样弹。\n这就是鼓浪屿。音乐，是这里的邻里关系。\n为什么偏偏是这座岛？\n有人说，是海风。海风把琴声吹散，也把外面的世界吹进来。\n有人说，是孤独。小岛与陆地隔着一道窄窄的海峡。在船上，人们想家，音乐，就成了回家的路。\n岛上还有一座钢琴博物馆，藏着一百多架古钢琴，很多是华侨胡友义从世界各地搜集来的。\n这些钢琴，漂洋过海，最后回到了故乡。\n鼓浪屿最特别的地方，是全岛没有机动车。\n你只能步行。\n所以你听不见喇叭声，听不见引擎声。你听见的，只有海浪，鸟鸣，和不知道从哪条巷子飘来的琴声。\n2017年，鼓浪屿被列入世界文化遗产。\n申报的理由里，有一句话：鼓浪屿，是文化交融的杰出见证。\n但鼓浪屿人自己，有更简单的说法。\n他们说，这座岛，是用琴声铺路的。\n所以，下次你登上鼓浪屿，别急着找景点。\n就沿着石板路慢慢走。遇到岔路口，别犹豫，跟着琴声走。\n琴声停下的地方，就是鼓浪屿，想给你的答案。",
    source: "参考自鼓浪屿世界文化遗产申报文本、鼓浪屿钢琴博物馆资料（演示）。",
  },
];

// 运行时数据源：默认用内置数据（离线演示模式），loadStories() 成功后替换为 API 数据
let STORIES = BUILTIN_STORIES;

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
  user: null, // { type:"phone"|"wechat", nickname, phone?, loginAt }
  feedSearchOpen: false,
  playbackProgress: {}, // { storyId: seconds_played }
  playbackCompleted: {}, // { storyId: true } — 已完播
  userLat: null,
  userLng: null,
  userCity: null, // 定位反查出的城市（高德逆地理编码）
  coarseLoc: false, // true = IP 粗略定位（城市级，不做 200m 检测）
  locationGranted: false,
  token: null, // 云端登录令牌（JWT）
  favRemoved: [], // 已取消收藏待同步的 slug（防止云合并后复活）
  syncedAt: null, // 最近一次云端同步时间
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
   后端 API 接入（离线时自动回退到内置数据）
   ================================================================ */
const API_BASE = "http://localhost:3000";
let apiOnline = false; // 最近一次请求成功即 true；失败即 false
const scriptCache = {}; // slug -> { script, source }（详情正文缓存）

// 高德开放平台 Web端（JS API）Key；安全密钥明文方式仅限本地开发，上线需换服务端代理
const AMAP_KEY = "d6c071bd48d515187d4cea2a72aa849c";
const AMAP_SECURITY_CODE = "2bcc830b6bd2c705752ba25377a1de99";

async function api(path, opts = {}) {
  const headers = { ...(opts.headers || {}) };
  if (opts.body) headers["Content-Type"] = "application/json";
  if (state.token) headers["Authorization"] = "Bearer " + state.token;
  let res;
  try {
    res = await fetch(API_BASE + path, { ...opts, headers });
  } catch (e) {
    apiOnline = false;
    throw e;
  }
  apiOnline = true;
  if (res.status === 401 && state.token) {
    // 令牌失效：静默清除，本地数据与用户态保留（降级可用）
    state.token = null;
    saveState();
  }
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const err = new Error(body.error || "网络错误，请稍后再试");
    err.status = res.status;
    throw err;
  }
  return res.json();
}

function formatPlays(n) {
  n = Number(n) || 0;
  if (n >= 10000) return (n / 10000).toFixed(1).replace(/\.0$/, "") + "万";
  return String(n);
}

/** 远程故事没有 mapPin 时的兜底：经纬度归一化投影到地图舞台百分比坐标 */
function projectMapPin(lat, lng) {
  if (typeof lat !== "number" || typeof lng !== "number") return { x: 50, y: 50 };
  const lats = STORIES.map((s) => s.lat).filter((v) => typeof v === "number");
  const lngs = STORIES.map((s) => s.lng).filter((v) => typeof v === "number");
  const minLat = Math.min(...lats, lat);
  const maxLat = Math.max(...lats, lat);
  const minLng = Math.min(...lngs, lng);
  const maxLng = Math.max(...lngs, lng);
  const x = 15 + ((lng - minLng) / Math.max(1e-9, maxLng - minLng)) * 70;
  const y = 15 + ((maxLat - lat) / Math.max(1e-9, maxLat - minLat)) * 70;
  return { x: Math.round(x), y: Math.round(y) };
}

/** API 字段 → 前端内部字段；本地同 slug 故事提供 mapPin 与正文（手工数据，无法由 API 推导） */
function mapRemoteStory(r, local) {
  return {
    id: r.slug,
    title: r.title,
    spot: r.spot,
    city: r.city,
    mood: (Array.isArray(r.emotionTags) && r.emotionTags[0]) || "治愈",
    category: r.category,
    hook: r.hook,
    durationMin: Math.max(1, Math.round((Number(r.durationSec) || 0) / 60)),
    durationSec: Number(r.durationSec) || 0,
    plays: formatPlays(r.playCount),
    cover: r.cover,
    mapPin: (local && local.mapPin) || projectMapPin(r.lat, r.lng),
    lat: r.lat,
    lng: r.lng,
    script: (local && local.script) || "", // 详情接口到达后由 refreshScript 补齐
    source: (local && local.source) || "",
  };
}

async function loadStories() {
  try {
    const data = await api("/api/stories");
    const remote = (data.stories || []).map((r) =>
      mapRemoteStory(r, BUILTIN_STORIES.find((s) => s.id === r.slug))
    );
    if (remote.length) {
      STORIES = remote;
      apiOnline = true;
      rerenderAll();
    }
  } catch (_) {
    apiOnline = false; // 保留内置数据，进入离线演示模式
  }
}

/* ================================================================
   云端同步（登录后启用；合并语义由服务端保证）
   ================================================================ */
let syncTimer = null;
let syncInFlight = null;

function dedupe(arr) {
  return [...new Set(arr)];
}

function buildSyncPayload() {
  return {
    favorites: state.favIds.slice(),
    favoritesRemoved: state.favRemoved.slice(),
    progress: { ...state.playbackProgress },
    completed: Object.keys(state.playbackCompleted).filter(
      (k) => state.playbackCompleted[k]
    ),
    history: state.historyIds.slice(),
    trip: state.tripIds.slice(),
    rate: tts.rate,
  };
}

/** 采纳服务端合并态：进度/完播只增不减；未知 slug 保留本地待下次 */
function adoptMergedState(r) {
  const ignored = new Set(r.ignored || []);
  state.favIds = dedupe([
    ...(r.favorites || []),
    ...state.favIds.filter((id) => ignored.has(id)),
  ]);
  for (const [slug, sec] of Object.entries(r.progress || {})) {
    state.playbackProgress[slug] = Math.max(
      state.playbackProgress[slug] || 0,
      Number(sec) || 0
    );
  }
  for (const slug of r.completed || []) state.playbackCompleted[slug] = true;
  state.historyIds = dedupe([
    ...state.historyIds.filter((id) => ignored.has(id)),
    ...(r.history || []),
  ]).slice(0, 50);
  state.tripIds = dedupe([
    ...(r.trip || []),
    ...state.tripIds.filter((id) => ignored.has(id)),
  ]);
  state.favRemoved = state.favRemoved.filter((id) => ignored.has(id));
  state.syncedAt = r.syncedAt || null;
}

function syncNow() {
  if (!state.token || !apiOnline) return Promise.resolve(null);
  if (syncInFlight) return syncInFlight;
  syncInFlight = (async () => {
    try {
      const r = await api("/api/sync", {
        method: "POST",
        body: JSON.stringify(buildSyncPayload()),
        keepalive: true,
      });
      const firstSync = !state.syncedAt;
      adoptMergedState(r);
      saveState();
      rerenderUserViews();
      if (firstSync) toast("☁️ 云端同步已开启");
      return r;
    } catch (_) {
      return null; // 失败已由 api() 置 apiOnline=false
    } finally {
      syncInFlight = null;
    }
  })();
  return syncInFlight;
}

function scheduleSync() {
  if (!state.token || !apiOnline) return;
  clearTimeout(syncTimer);
  syncTimer = setTimeout(syncNow, 5000);
}

function rerenderUserViews() {
  renderMeStats();
  renderHistoryList();
  renderFavList();
  renderTripList();
  renderFeed();
}

function rerenderAll() {
  rerenderUserViews();
  renderMapPins();
  renderCityTags();
  if (state.mapSelectedId) selectMapStory(state.mapSelectedId);
}

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
let amapPromise = null;

/** 惰性加载高德 JS API（仅定位时需要，~1MB）；失败/超时 resolve(null)，后续走原生定位 */
function loadAmap() {
  if (amapPromise) return amapPromise;
  amapPromise = new Promise((resolve) => {
    // 安全密钥必须在 JS API 脚本加载之前设置，否则无效
    window._AMapSecurityConfig = { securityJsCode: AMAP_SECURITY_CODE };
    const s = document.createElement("script");
    const timer = setTimeout(() => resolve(null), 12000); // 12s 超时兜底
    s.src = `https://webapi.amap.com/maps?v=2.0&key=${AMAP_KEY}`;
    s.onload = () => {
      clearTimeout(timer);
      resolve(window.AMap || null);
    };
    s.onerror = () => {
      clearTimeout(timer);
      resolve(null);
    };
    document.head.appendChild(s);
  });
  return amapPromise;
}

/** 高德定位：浏览器 GPS 优先，权限拒绝时自动 IP 城市级兜底，并逆地理编码出城市名 */
function amapLocate(onDone) {
  let settled = false;
  const finish = (r) => {
    if (!settled) {
      settled = true;
      onDone(r);
    }
  };
  const guard = setTimeout(() => finish({ ok: false }), 15000); // 插件级超时保护
  try {
    AMap.plugin("AMap.Geolocation", () => {
      const geo = new AMap.Geolocation({
        enableHighAccuracy: true,
        timeout: 10000,
        needAddress: true,
        extensions: "all",
      });
      geo.getCurrentPosition((status, result) => {
        clearTimeout(guard);
        if (status === "complete" && result && result.position) {
          const ac = result.addressComponent || {};
          // 直辖市 city 为空时取 province；统一去「市」后缀对齐 CITIES 列表
          const city = String(ac.city || ac.province || "").replace(/市$/, "");
          finish({
            ok: true,
            lat: result.position.lat,
            lng: result.position.lng,
            city,
            coarse: result.location_type === "ip", // IP 定位 = 城市级粗略坐标
            accuracy: result.accuracy || 0,
          });
        } else {
          finish({ ok: false });
        }
      });
    });
  } catch (_) {
    clearTimeout(guard);
    finish({ ok: false });
  }
}

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
  if (state.userLat == null || state.userLng == null || state.coarseLoc) return [];
  return STORIES.filter((s) => {
    const d = calcDistance(state.userLat, state.userLng, s.lat, s.lng);
    return d <= radiusMeters;
  });
}

function formatDistance(meters) {
  if (meters < 1000) return `${Math.round(meters)}m`;
  return `${(meters / 1000).toFixed(1)}km`;
}

async function requestUserLocation() {
  const amap = await loadAmap();
  if (amap) {
    amapLocate((r) => {
      if (r.ok) applyLocation(r);
      else nativeLocate(); // 高德失败：回退原生定位
    });
    return;
  }
  nativeLocate();
}

/** 原生浏览器定位（高德不可用时的兜底，无城市反查） */
function nativeLocate() {
  if (!navigator.geolocation) {
    toast("当前浏览器不支持地理定位");
    return;
  }

  navigator.geolocation.getCurrentPosition(
    (pos) => {
      applyLocation({
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
        city: null,
        coarse: false,
        accuracy: pos.coords.accuracy,
      });
    },
    (err) => {
      fetchIpCity().then((ok) => {
        if (ok) return; // IP 城市兜底成功，不再弹错误提示
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
      });
    },
    { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
  );
}

/** 定位成功的统一落点：写状态、toast、刷新角标与附近检测 */
function applyLocation({ lat, lng, city, coarse, accuracy }) {
  state.userLat = lat;
  state.userLng = lng;
  state.userCity = city || null;
  state.coarseLoc = !!coarse;
  state.locationGranted = true;
  saveState();

  if (coarse) {
    toast(`已定位到所在城市（${city || "粗略位置"}）`);
  } else if (accuracy > 0) {
    toast(`已定位（精度约 ${Math.round(accuracy)}m）`);
  } else {
    toast("已定位");
  }
  updateMapLocationUI();
  applyLocatedCity(city);
  if (!coarse) checkNearbyProximity(); // IP 粗略坐标不触发 200m 检测
}

/** 定位出城市后自动切换城市筛选（仅当用户还停留在「全部」，手动选过的不抢） */
function applyLocatedCity(city) {
  const name = String(city || "").replace(/市$/, "");
  if (!name || !CITIES.includes(name)) return false;
  if (state.cityFilter !== "全部") return false;
  state.cityFilter = name;
  saveState();
  renderCityTags();
  renderFeed();
  return true;
}

/** IP 城市级兜底（无坐标）：只更新城市与筛选，不覆盖已有精确坐标 */
function applyIpCity(city) {
  const name = String(city || "").replace(/市$/, "");
  if (!name) return;
  state.userCity = name;
  state.coarseLoc = true;
  state.locationGranted = true;
  saveState();
  updateMapLocationUI();
  applyLocatedCity(name);
  toast(`已定位到所在城市（${name}）`);
}

/** 高德 IP 定位不可用时的兜底：经自家后端查 IP 所在城市（城市级、无坐标） */
async function fetchIpCity() {
  if (!apiOnline) return false;
  try {
    const data = await api("/api/geo/ip");
    if (data && data.city) {
      applyIpCity(data.city);
      return true;
    }
  } catch (_) {
    /* 后端兜底也失败：走原有错误提示 */
  }
  return false;
}

function updateMapLocationUI() {
  const existing = document.querySelector(".map-location-status");
  if (existing) existing.remove();

  if ((state.userLat != null && state.userLng != null) || state.userCity != null) {
    const badge = document.createElement("div");
    badge.className = "map-location-status";
    badge.style.cssText =
      "position:absolute;top:8px;right:16px;z-index:4;" +
      "padding:6px 12px;border-radius:999px;" +
      "background:rgba(46,196,182,.9);color:#fff;font-size:12px;font-weight:600;" +
      "box-shadow:0 2px 12px rgba(46,196,182,.35);";
    badge.textContent = state.userCity ? `📍 已定位 · ${state.userCity}` : "📍 已定位";
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

// 初始化时恢复定位（静默更新：优先高德含城市反查，失败回退原生）
function initGeolocation() {
  if (!state.locationGranted || state.userLat == null) return;
  updateMapLocationUI();
  loadAmap().then((amap) => {
    if (amap) {
      amapLocate((r) => {
        if (r.ok) {
          state.userLat = r.lat;
          state.userLng = r.lng;
          state.userCity = r.city || null;
          state.coarseLoc = !!r.coarse;
          saveState();
          updateMapLocationUI();
          applyLocatedCity(r.city);
        } else {
          nativeLocateSilent();
        }
      });
      return;
    }
    nativeLocateSilent();
  });
}

/** 原生静默定位（无 toast，失败忽略） */
function nativeLocateSilent() {
  if (!navigator.geolocation) return;
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      state.userLat = pos.coords.latitude;
      state.userLng = pos.coords.longitude;
      state.coarseLoc = false;
      saveState();
      updateMapLocationUI();
    },
    () => {},
    { enableHighAccuracy: false, timeout: 6000, maximumAge: 120000 }
  );
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
  scheduleSync();
}

function toggleFav(id) {
  if (state.favIds.includes(id)) {
    state.favIds = state.favIds.filter((x) => x !== id);
    // 记录取消，防止云合并后复活
    if (!state.favRemoved.includes(id)) state.favRemoved.push(id);
    toast("已取消收藏");
  } else {
    state.favIds.push(id);
    state.favRemoved = state.favRemoved.filter((x) => x !== id);
    toast("已收藏");
  }
  renderFavList();
  renderMeStats();
  saveState();
  scheduleSync();
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
  scheduleSync();
}

/* ================================================================
   播放器（TTS 语音朗读 + 断点续播）
   ================================================================ */
const tts = {
  storyId: null,
  sentences: [],
  cumStart: [],
  totalChars: 0,
  idx: 0,
  rate: 1,
  _rateAtSpeak: 1,
  paused: false,
  finished: false,
  sentStartAt: 0,
  sentAccumMs: 0,
  _cur: null,
  CHARS_PER_SEC: 4.5, // 1x 语速下估算朗读速度（字/秒）
};

function splitSentences(text) {
  const parts = (text || "").match(/[^。！？；\n]+[。！？；\n]?/g) || [];
  const out = [];
  for (const p of parts) {
    let chunk = p;
    // 长句再按逗号切分，避免部分浏览器对长语音静默中断
    while (chunk.length > 90) {
      let cut = -1;
      for (const mark of ["，", "：", "、", "—"]) {
        const pos = chunk.lastIndexOf(mark, 89);
        if (pos > 40) {
          cut = pos + 1;
          break;
        }
      }
      if (cut < 0) cut = 89;
      out.push(chunk.slice(0, cut));
      chunk = chunk.slice(cut);
    }
    out.push(chunk);
  }
  return out.filter((s) => s.trim());
}

function pickChineseVoice() {
  if (!("speechSynthesis" in window)) return null;
  const voices = speechSynthesis.getVoices();
  return (
    voices.find(
      (v) =>
        /^zh[-_]CN/i.test(v.lang) &&
        /Huihui|Yaoyao|Xiaoxiao|Yunxi|Xiaoyi/i.test(v.name)
    ) ||
    voices.find((v) => /^zh[-_]CN/i.test(v.lang)) ||
    voices.find((v) => /^zh/i.test(v.lang)) ||
    null
  );
}

function ttsElapsedChars() {
  if (!tts.storyId) return 0;
  if (tts.idx >= tts.sentences.length) return tts.totalChars;
  const sentLen = (tts.sentences[tts.idx] || "").length;
  let ms = tts.sentAccumMs;
  if (!tts.paused) ms += performance.now() - tts.sentStartAt;
  const spoken = (ms / 1000) * tts.rate * tts.CHARS_PER_SEC;
  return (tts.cumStart[tts.idx] || 0) + Math.min(sentLen, spoken);
}

function ttsProgressSeconds() {
  if (!tts.storyId || !tts.totalChars) return 0;
  return Math.min(ttsElapsedChars(), tts.totalChars) / tts.CHARS_PER_SEC;
}

function ttsTotalSeconds() {
  return tts.totalChars / tts.CHARS_PER_SEC;
}

function ttsSetup(id, script) {
  stopTts();
  tts.storyId = id;
  tts.sentences = splitSentences(script);
  tts.cumStart = [];
  tts.totalChars = 0;
  tts.sentences.forEach((s) => {
    tts.cumStart.push(tts.totalChars);
    tts.totalChars += s.length;
  });
  tts.idx = 0;
  tts.rate = 1;
  tts.paused = false;
  tts.finished = false;
  tts.sentAccumMs = 0;
}

function ttsSeekTo(sec) {
  if (!tts.sentences.length) {
    tts.idx = 0;
    return;
  }
  const target = Math.max(0, sec) * tts.CHARS_PER_SEC;
  if (target <= 0) {
    tts.idx = 0;
    return;
  }
  if (target >= tts.totalChars) {
    tts.idx = tts.sentences.length - 1;
    return;
  }
  let acc = 0;
  for (let i = 0; i < tts.sentences.length; i++) {
    acc += tts.sentences[i].length;
    if (acc >= target) {
      tts.idx = i;
      return;
    }
  }
}

function ttsSpeakFrom(idx) {
  tts.idx = idx;
  tts.sentAccumMs = 0;
  tts.sentStartAt = performance.now();
  tts.finished = false;
  speakCurrentSentence();
}

function speakCurrentSentence() {
  if (!tts.storyId || tts.idx >= tts.sentences.length) {
    ttsFinish();
    return;
  }
  if (!("speechSynthesis" in window)) {
    ttsFinish();
    toast("当前浏览器不支持语音朗读");
    return;
  }
  const u = new SpeechSynthesisUtterance(tts.sentences[tts.idx]);
  const voice = pickChineseVoice();
  if (voice) {
    u.voice = voice;
    u.lang = voice.lang;
  } else {
    u.lang = "zh-CN";
  }
  u.rate = tts.rate;
  tts._rateAtSpeak = tts.rate;
  u.onend = () => {
    if (tts._cur !== u) return; // 已被取消或替换
    tts.sentAccumMs = 0;
    tts.sentStartAt = performance.now();
    tts.idx += 1;
    if (tts.idx >= tts.sentences.length) {
      ttsFinish();
      return;
    }
    speakCurrentSentence();
  };
  u.onerror = u.onend; // 出错时跳到下一句，避免卡死
  tts._cur = u;
  speechSynthesis.speak(u);
}

function ttsFinish() {
  if (!tts.storyId || tts.finished) return;
  tts.finished = true;
  tts.paused = false;
  const id = tts.storyId;
  state.playbackCompleted[id] = true;
  state.playbackProgress[id] = 0;
  saveState();
  updateTtsPlayBtn();
  renderFeed();
  toast("故事已听完，为你推荐下一个 👇");
  scheduleSync();
}

function stopTts() {
  tts.storyId = null;
  tts._cur = null;
  tts.finished = false;
  tts.paused = false;
  if ("speechSynthesis" in window) speechSynthesis.cancel();
  updateTtsPlayBtn();
}

function toggleTtsPlay() {
  if (!tts.storyId) return;
  if (tts.finished || tts.idx >= tts.sentences.length) {
    // 已听完：从头重听
    state.playbackCompleted[tts.storyId] = false;
    saveState();
    tts.finished = false;
    tts.paused = false;
    ttsSeekTo(0);
    ttsSpeakFrom(0);
    updateTtsPlayBtn();
    return;
  }
  if (tts.paused) {
    if (tts.rate !== tts._rateAtSpeak) {
      // 语速在暂停期间被修改：从当前句重新开始
      tts._cur = null;
      speechSynthesis.cancel();
      tts.paused = false;
      tts.sentAccumMs = 0;
      tts.sentStartAt = performance.now();
      speakCurrentSentence();
    } else {
      speechSynthesis.resume();
      tts.paused = false;
      tts.sentStartAt = performance.now();
    }
  } else {
    tts.sentAccumMs += performance.now() - tts.sentStartAt;
    speechSynthesis.pause();
    tts.paused = true;
    _saveCurrentProgress();
  }
  updateTtsPlayBtn();
}

function updateTtsPlayBtn() {
  const btn = document.querySelector(".btn-tts-play");
  if (!btn) return;
  const playing =
    tts.storyId && !tts.paused && !tts.finished && tts.idx < tts.sentences.length;
  btn.textContent = playing ? "⏸" : "▶";
}

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
  // 有定位时显示真实距离（与地图卡模式一致）
  if (state.userLat != null && state.userLng != null && typeof s.lat === "number") {
    const dist = calcDistance(state.userLat, state.userLng, s.lat, s.lng);
    $("playerLoc").textContent = `${s.spot} · 距你 ${formatDistance(dist)}`;
  } else {
    $("playerLoc").textContent = s.spot;
  }
  $("playerHook").textContent = s.hook;
  $("sourceNote").textContent = `信源说明：${s.source}`;

  // 初始化 TTS
  ttsSetup(id, s.script);

  // 断点续播
  const savedProgress = state.playbackProgress[id] || 0;
  const completed = state.playbackCompleted[id];
  if (completed) {
    ttsSeekTo(0);
  } else if (savedProgress > 5) {
    ttsSeekTo(savedProgress);
    toast(
      `已从上次位置续播（剩余 ${formatRemain(ttsTotalSeconds() - ttsProgressSeconds())}）`
    );
  } else {
    ttsSeekTo(0);
  }

  const next = getNextRecommend(id);
  const nextHasProgress =
    state.playbackProgress[next.id] > 10 && !state.playbackCompleted[next.id];
  $("nextStoryBtn").textContent =
    `《${next.title}》· ${next.durationMin} 分钟 · 点选播放（不自动连播）` +
    (nextHasProgress ? " ⏯" : "");

  updateFavButtonState();
  bindSpeedButtons();
  updateTtsPlayBtn();

  ttsSpeakFrom(tts.idx);

  // 异步拉取 API 详情正文（本地正文先行开播，远程到达后按条件热替换）
  refreshScript(s);
}

/** 获取远程正文并缓存；仅当还没真正开读（第 0 句、<1s）时热替换，否则下次打开生效 */
async function refreshScript(s) {
  if (!apiOnline) return;
  if (scriptCache[s.id]) {
    applyScript(s, scriptCache[s.id]);
    return;
  }
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 3000);
  try {
    const d = await api("/api/stories/" + encodeURIComponent(s.id), {
      signal: ctrl.signal,
    });
    const detail = d.story || {};
    scriptCache[s.id] = {
      script: detail.script || s.script,
      source: detail.sourceNote || s.source,
    };
    applyScript(s, scriptCache[s.id]);
  } catch (_) {
    /* 保留本地正文 */
  } finally {
    clearTimeout(t);
  }
}

function applyScript(s, { script, source }) {
  const changed = script && script !== s.script;
  s.script = script || s.script;
  s.source = source || s.source;
  const isCurrent = state.currentPlayId === s.id;
  if (isCurrent) {
    $("sourceNote").textContent = `信源说明：${s.source}`;
  }
  if (changed && isCurrent && tts.idx === 0 && tts.sentAccumMs < 1000) {
    ttsSetup(s.id, script); // 尚未真正开读：热替换正文
  }
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
  stopTts();
  $("playerOverlay").classList.add("hidden");
  $("playerOverlay").setAttribute("aria-hidden", "true");
  state.currentPlayId = null;
  saveState();

  // 刷新 Feed 以更新续播标签
  renderFeed();
}

function _saveCurrentProgress() {
  const id = tts.storyId || state.currentPlayId;
  if (!id || tts.finished) return;
  const sec = ttsProgressSeconds();
  if (sec <= 0) return;
  state.playbackProgress[id] = sec;
  saveState();
  scheduleSync();
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
      tts.rate = sp;
      // 正在朗读时，从当前句重新开始以应用新语速
      if (
        tts.storyId &&
        !tts.paused &&
        !tts.finished &&
        tts.idx < tts.sentences.length
      ) {
        tts._cur = null;
        speechSynthesis.cancel();
        tts.sentAccumMs = 0;
        tts.sentStartAt = performance.now();
        speakCurrentSentence();
      }
    });
    row.appendChild(b);
  });
}

function bindAudioUi() {
  const seek = $("seekBar");

  // 拖动进度条（松开时定位到对应句子）
  seek.addEventListener("change", () => {
    if (!tts.storyId || !tts.totalChars) return;
    const sec = (Number(seek.value) / 100) * ttsTotalSeconds();
    ttsSeekTo(sec);
    tts._cur = null;
    speechSynthesis.cancel();
    tts.finished = false;
    tts.paused = false;
    tts.sentAccumMs = 0;
    tts.sentStartAt = performance.now();
    speakCurrentSentence();
    updateTtsPlayBtn();
  });

  // 播放进度刷新 + 浏览器长语音中断兜底
  setInterval(() => {
    if (!tts.storyId || $("playerOverlay").classList.contains("hidden")) return;
    const total = ttsTotalSeconds();
    const played = ttsProgressSeconds();
    if (total > 0 && document.activeElement !== seek) {
      seek.value = String(Math.min(100, (played / total) * 100));
    }
    $("timeRemaining").textContent = `剩余 ${formatRemain(total - played)}`;
    // 部分浏览器对长语音会静默中断，resume 兜底
    if (!tts.paused && !tts.finished && !speechSynthesis.speaking) {
      speechSynthesis.resume();
    }
  }, 250);

  // 定期保存进度
  setInterval(() => {
    if (state.currentPlayId && !tts.paused && !tts.finished) {
      _saveCurrentProgress();
    }
  }, 10000);

  // 页面卸载前保存进度 + 立即同步（keepalive fetch）
  window.addEventListener("beforeunload", () => {
    _saveCurrentProgress();
    syncNow();
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
   内容纠错 Sheet（动态注入到 body，不改动 index.html）
   ================================================================ */
let reportEls = null; // 惰性构建一次，复用节点，用 .hidden 切换

function buildReportSheet() {
  if (reportEls) return reportEls;
  const scrim = document.createElement("div");
  scrim.className = "sheet-scrim report-scrim hidden"; // 复用预览 scrim 样式，仅覆盖 z-index
  const sheet = document.createElement("div");
  sheet.className = "sheet report-sheet hidden"; // 复用 .sheet/.sheet-handle 弹层样式
  sheet.innerHTML = `
    <div class="sheet-handle"></div>
    <h3>内容纠错</h3>
    <p class="report-context"></p>
    <textarea class="report-textarea" placeholder="请指出事实错误或补充资料，5-500字"></textarea>
    <button type="button" class="btn-primary-block" id="reportSubmit">提交反馈</button>
    <button type="button" class="link-btn" id="reportCancel">取消</button>
  `;
  sheet.querySelector("#reportCancel").addEventListener("click", closeReportSheet);
  sheet.querySelector("#reportSubmit").addEventListener("click", submitReport);
  scrim.addEventListener("click", closeReportSheet);
  document.body.appendChild(scrim);
  document.body.appendChild(sheet);
  reportEls = {
    scrim,
    sheet,
    context: sheet.querySelector(".report-context"),
    textarea: sheet.querySelector(".report-textarea"),
    submit: sheet.querySelector("#reportSubmit"),
  };
  return reportEls;
}

function openReportSheet() {
  const id = state.currentPlayId;
  const s = id ? getStory(id) : null;
  if (!s) return;
  const els = buildReportSheet();
  els.context.textContent = `正在纠错：《${s.title}》 · ${s.spot}`; // textContent 防注入
  els.textarea.value = "";
  els.sheet.classList.remove("hidden");
  els.scrim.classList.remove("hidden");
  setTimeout(() => els.textarea.focus(), 50);
}

function closeReportSheet() {
  if (!reportEls) return;
  reportEls.sheet.classList.add("hidden");
  reportEls.scrim.classList.add("hidden");
}

async function submitReport() {
  const els = buildReportSheet();
  const content = els.textarea.value.trim();
  if (content.length < 5 || content.length > 500) {
    toast("纠错内容需在5-500字之间");
    return;
  }
  if (!apiOnline) {
    toast("当前为离线模式，反馈暂无法提交");
    return; // 保留弹层与草稿，用户可稍后重试
  }
  const id = state.currentPlayId;
  if (!id) return;
  els.submit.disabled = true;
  try {
    await api(`/api/stories/${encodeURIComponent(id)}/report`, {
      method: "POST",
      body: JSON.stringify({ content }),
    });
    toast("反馈已提交，感谢纠错 🙏");
    closeReportSheet();
  } catch (e) {
    // 网络失败时 api() 已置 apiOnline=false → 离线提示；业务错误用中文 e.message
    toast(apiOnline ? e.message : "当前为离线模式，反馈暂无法提交");
  } finally {
    els.submit.disabled = false;
  }
}

/* ================================================================
   登录
   ================================================================ */
function bindLogin() {
  if (state.loginDismissed || state.user) {
    $("loginOverlay").classList.add("hidden");
  }

  const hide = () => {
    $("loginOverlay").classList.add("hidden");
    state.loginDismissed = true;
    saveState();
  };

  const isValidPhone = (phone) => /^1\d{10}$/.test(phone);

  $("loginGetCode").addEventListener("click", async () => {
    const btn = $("loginGetCode");
    const phone = ($("loginPhoneInput").value || "").trim();
    if (!isValidPhone(phone)) {
      toast("请输入正确的 11 位手机号");
      return;
    }
    if (!codeSent) {
      // 第一步：发送验证码（API 可用时真实入库，验证码随响应返回）
      if (apiOnline) {
        btn.disabled = true;
        try {
          const r = await api("/api/auth/sms/send", {
            method: "POST",
            body: JSON.stringify({ phone }),
          });
          sentPhone = phone;
          toast(`验证码已发送（演示环境验证码：${r.devCode}）`);
        } catch (_) {
          toast("验证码已发送（演示：输入任意 6 位）"); // API 不可达 → 本地演示
        } finally {
          btn.disabled = false;
        }
      } else {
        toast("验证码已发送（演示：输入任意 6 位）");
      }
      codeSent = true;
      $("loginCodeRow").classList.remove("hidden");
      btn.textContent = "登录";
      $("loginCodeInput").focus();
      return;
    }
    // 第二步：校验验证码并登录
    const code = ($("loginCodeInput").value || "").trim();
    if (code.length < 4) {
      toast("请输入验证码");
      return;
    }
    if (apiOnline) {
      btn.disabled = true;
      try {
        const r = await api("/api/auth/sms/verify", {
          method: "POST",
          body: JSON.stringify({ phone: sentPhone || phone, code }),
        });
        state.token = r.token;
        saveState();
        hide();
        setUser(r.user);
        toast("登录成功，正在同步云端数据…");
        await syncNow();
        toast("登录成功，数据已同步 ✨");
      } catch (e) {
        toast(e.message || "验证失败，请重试");
      } finally {
        btn.disabled = false;
      }
      return;
    }
    // 离线演示：任意 ≥4 位验证码（原 mock 流程）
    hide();
    setUser({
      type: "phone",
      phone: phone.slice(0, 3) + "****" + phone.slice(-4),
      nickname: "旅人" + phone.slice(-4),
      loginAt: Date.now(),
    });
    toast("登录成功，欢迎回来 ✨（离线演示）");
  });

  $("loginWechat").addEventListener("click", () => {
    hide();
    setUser({ type: "wechat", nickname: "微信用户", loginAt: Date.now() });
    toast("微信登录成功（云端同步即将上线）");
  });

  $("loginSkip").addEventListener("click", hide);
}

/* ================================================================
   账号（演示版：登录状态持久化 + 退出登录）
   ================================================================ */
let codeSent = false;
let sentPhone = null; // 发码时的手机号（防止验证时换号）
let logoutConfirmTimer = null;

function setUser(u) {
  state.user = u;
  saveState();
  renderMeUser();
}

function logout() {
  state.user = null;
  state.token = null;
  state.favRemoved = [];
  saveState();
  renderMeUser();
  toast("已退出登录，本地数据已保留");
}

function openLoginOverlay() {
  // 重置验证码流程与表单
  codeSent = false;
  sentPhone = null;
  $("loginPhoneInput").value = "";
  $("loginCodeInput").value = "";
  $("loginCodeRow").classList.add("hidden");
  $("loginGetCode").textContent = "获取验证码";
  $("loginOverlay").classList.remove("hidden");
}

function renderMeUser() {
  const nameEl = document.querySelector(".me-name");
  const taglineEl = document.querySelector(".me-tagline");
  const heroText = document.querySelector(".me-hero-text");

  // 移除旧按钮（动态注入，不改动 index.html）
  document.querySelectorAll(".me-auth-btn").forEach((b) => b.remove());

  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "me-auth-btn";

  if (state.user) {
    const u = state.user;
    nameEl.textContent = u.nickname;
    taglineEl.textContent =
      u.type === "wechat" ? "已通过微信登录" : `手机号 ${u.phone}`;
    btn.textContent = "退出登录";
    btn.addEventListener("click", () => {
      // 两步确认，避免误触
      if (btn.textContent === "确认退出？") {
        clearTimeout(logoutConfirmTimer);
        logout();
        return;
      }
      btn.textContent = "确认退出？";
      logoutConfirmTimer = setTimeout(() => {
        btn.textContent = "退出登录";
      }, 3000);
    });
  } else {
    nameEl.textContent = "流光旅人";
    taglineEl.textContent = "探索 · 发现 · 记录";
    btn.textContent = "登录 / 注册";
    btn.addEventListener("click", openLoginOverlay);
  }

  heroText.appendChild(btn);
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
  if (state.loginDismissed || state.user) {
    $("loginOverlay").classList.add("hidden");
  }

  renderMapPins();
  renderCityTags();
  renderFeed();
  renderMeStats();
  renderMeUser();
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

  // 播放/暂停按钮（动态注入，不改动 index.html）
  const playBtn = document.createElement("button");
  playBtn.type = "button";
  playBtn.className = "btn-tts-play";
  playBtn.textContent = "▶";
  playBtn.setAttribute("aria-label", "播放 / 暂停");
  playBtn.addEventListener("click", toggleTtsPlay);
  document.querySelector(".player-controls").appendChild(playBtn);

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
  $("btnReport").addEventListener("click", openReportSheet);

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

  // 预热语音列表（部分浏览器异步加载中文语音）
  if ("speechSynthesis" in window) {
    speechSynthesis.getVoices();
  }

  // 全局键盘事件（纠错弹层优先关闭，其次播放器）
  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    if (reportEls && !reportEls.sheet.classList.contains("hidden")) {
      closeReportSheet(); // 只关纠错弹层，播放器保持打开
      return;
    }
    if (!$("playerOverlay").classList.contains("hidden")) {
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

  // 拉取 API 故事数据（失败自动回退内置数据）；登录态则启动云端同步
  loadStories().then(() => {
    if (state.token && apiOnline) {
      syncNow(); // 拉取/推送合并
      api("/api/me").catch(() => {}); // 校验令牌；失效由 api() 静默清除
    }
  });
}

init();
