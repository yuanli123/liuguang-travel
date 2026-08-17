-- 流光幻旅 · 数据库结构（MySQL 8）
-- 由 db/init.js 建库后执行；全部语句可重复执行（IF NOT EXISTS）
-- 约定：不建外键约束，关联完整性由应用层保证；时间均为 DATETIME（本地服务器时区）

SET NAMES utf8mb4;

-- ============================================================
-- 一、用户与账号
-- ============================================================

CREATE TABLE IF NOT EXISTS users (
  id            BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '用户ID',
  phone         VARCHAR(11)     NULL COMMENT '真实手机号（仅服务端保存）',
  wechat_openid VARCHAR(64)     NULL COMMENT '微信 openid（微信登录预留）',
  nickname      VARCHAR(64)     NOT NULL DEFAULT '旅人' COMMENT '昵称',
  avatar_url    VARCHAR(255)    NULL COMMENT '头像地址',
  status        TINYINT         NOT NULL DEFAULT 1 COMMENT '状态：1正常 0封禁',
  created_at    DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '注册时间',
  updated_at    DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (id),
  UNIQUE KEY uk_phone (phone),
  UNIQUE KEY uk_openid (wechat_openid)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户';

CREATE TABLE IF NOT EXISTS sms_codes (
  id         BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '记录ID',
  phone      VARCHAR(11)     NOT NULL COMMENT '接收手机号',
  code       CHAR(6)         NOT NULL COMMENT '6位验证码',
  expires_at DATETIME        NOT NULL COMMENT '过期时间',
  used       TINYINT(1)      NOT NULL DEFAULT 0 COMMENT '是否已使用：1是 0否',
  created_at DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '发送时间',
  PRIMARY KEY (id),
  KEY idx_phone_time (phone, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='短信验证码';

-- ============================================================
-- 二、内容：故事 / 点位 / 主题 / 版本 / 纠错
-- ============================================================

CREATE TABLE IF NOT EXISTS stories (
  id           BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '故事ID',
  slug         VARCHAR(64)     NOT NULL COMMENT '英文标识，前端状态用它关联故事（如 kunming）',
  title        VARCHAR(128)    NOT NULL COMMENT '标题',
  hook         VARCHAR(255)    NULL COMMENT '钩子文案',
  emotion_tags JSON            NULL COMMENT '情绪标签数组，如 ["治愈","震撼"]',
  script       MEDIUMTEXT      NOT NULL COMMENT '完整故事正文',
  audio_url    VARCHAR(255)    NULL COMMENT 'AI 语音合成音频地址（二期）',
  duration_sec INT UNSIGNED    NULL COMMENT '预计收听时长（秒）',
  cover_url    VARCHAR(500)    NULL COMMENT '封面图地址',
  source_note  VARCHAR(500)    NULL COMMENT '信源说明，展示在播放页底部',
  city         VARCHAR(32)     NOT NULL COMMENT '所属城市',
  status       TINYINT         NOT NULL DEFAULT 0 COMMENT '状态：0草稿 1审核中 2已上架 3下架',
  play_count   INT UNSIGNED    NOT NULL DEFAULT 0 COMMENT '播放次数（冗余计数，加速列表排序）',
  created_by   BIGINT UNSIGNED NULL COMMENT '创建者用户ID（内容创作者/管理员）',
  published_at DATETIME        NULL COMMENT '上架时间',
  deleted_at   DATETIME        NULL COMMENT '软删除时间（非空即删除）',
  created_at   DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  updated_at   DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (id),
  UNIQUE KEY uk_slug (slug),
  KEY idx_city_status (city, status),
  KEY idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='故事';

CREATE TABLE IF NOT EXISTS points (
  id       BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '点位ID',
  name     VARCHAR(128)    NOT NULL COMMENT '点位名（如「颐和园 · 昆明湖」）',
  city     VARCHAR(32)     NOT NULL COMMENT '所属城市',
  lat      DECIMAL(9,6)    NOT NULL COMMENT '纬度',
  lng      DECIMAL(9,6)    NOT NULL COMMENT '经度',
  radius_m SMALLINT UNSIGNED NOT NULL DEFAULT 200 COMMENT '触发半径（米），默认200',
  address  VARCHAR(255)    NULL COMMENT '详细地址',
  PRIMARY KEY (id),
  UNIQUE KEY uk_name_city (name, city),
  KEY idx_city (city)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='景点/点位';

CREATE TABLE IF NOT EXISTS story_points (
  story_id BIGINT UNSIGNED  NOT NULL COMMENT '故事ID',
  point_id BIGINT UNSIGNED  NOT NULL COMMENT '点位ID',
  sort     TINYINT UNSIGNED NOT NULL DEFAULT 0 COMMENT '点位在故事中的顺序',
  PRIMARY KEY (story_id, point_id),
  KEY idx_point (point_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='故事-点位关联';

CREATE TABLE IF NOT EXISTS topics (
  id    BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '主题ID',
  name  VARCHAR(32)     NOT NULL COMMENT '主题名（如 传说/历史/人文/地质）',
  cover VARCHAR(500)    NULL COMMENT '主题封面图',
  PRIMARY KEY (id),
  UNIQUE KEY uk_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='主题/专题';

CREATE TABLE IF NOT EXISTS story_topics (
  story_id BIGINT UNSIGNED NOT NULL COMMENT '故事ID',
  topic_id BIGINT UNSIGNED NOT NULL COMMENT '主题ID',
  PRIMARY KEY (story_id, topic_id),
  KEY idx_topic (topic_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='故事-主题关联';

CREATE TABLE IF NOT EXISTS story_versions (
  id          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '版本ID',
  story_id    BIGINT UNSIGNED NOT NULL COMMENT '故事ID',
  version_no  INT UNSIGNED    NOT NULL COMMENT '版本号',
  snapshot    JSON            NOT NULL COMMENT '该版本完整内容快照',
  change_note VARCHAR(255)    NULL COMMENT '修改说明',
  reviewed_by BIGINT UNSIGNED NULL COMMENT '审核人用户ID',
  reviewed_at DATETIME        NULL COMMENT '审核时间',
  created_at  DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  PRIMARY KEY (id),
  UNIQUE KEY uk_story_ver (story_id, version_no)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='故事版本与审核流';

CREATE TABLE IF NOT EXISTS story_reports (
  id          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '纠错ID',
  user_id     BIGINT UNSIGNED NULL COMMENT '提交者用户ID（游客可为空）',
  story_id    BIGINT UNSIGNED NOT NULL COMMENT '故事ID',
  content     TEXT            NOT NULL COMMENT '纠错内容',
  status      TINYINT         NOT NULL DEFAULT 0 COMMENT '状态：0待处理 1已采纳 2已驳回',
  resolved_by BIGINT UNSIGNED NULL COMMENT '处理人用户ID',
  created_at  DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '提交时间',
  PRIMARY KEY (id),
  KEY idx_story_status (story_id, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='内容纠错';

-- ============================================================
-- 三、用户行为：进度 / 历史 / 收藏 / 统计 / 下载
-- ============================================================

CREATE TABLE IF NOT EXISTS play_progress (
  user_id      BIGINT UNSIGNED NOT NULL COMMENT '用户ID',
  story_id     BIGINT UNSIGNED NOT NULL COMMENT '故事ID',
  progress_sec INT UNSIGNED    NOT NULL DEFAULT 0 COMMENT '断点续播秒数',
  completed    TINYINT(1)      NOT NULL DEFAULT 0 COMMENT '是否完播：1是 0否',
  speed        DECIMAL(3,2)    NOT NULL DEFAULT 1.00 COMMENT '最近一次使用的倍速',
  updated_at   DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (user_id, story_id),
  KEY idx_story (story_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='播放进度（断点续播）';

CREATE TABLE IF NOT EXISTS play_history (
  id           BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '记录ID',
  user_id      BIGINT UNSIGNED NOT NULL COMMENT '用户ID',
  story_id     BIGINT UNSIGNED NOT NULL COMMENT '故事ID',
  listened_sec INT UNSIGNED    NOT NULL COMMENT '本次收听时长（秒）',
  completed    TINYINT(1)      NOT NULL DEFAULT 0 COMMENT '本次是否完播：1是 0否',
  played_at    DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '收听时间',
  PRIMARY KEY (id),
  KEY idx_user_played (user_id, played_at),
  KEY idx_story (story_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='播放历史明细';

CREATE TABLE IF NOT EXISTS favorites (
  user_id    BIGINT UNSIGNED NOT NULL COMMENT '用户ID',
  story_id   BIGINT UNSIGNED NOT NULL COMMENT '故事ID',
  created_at DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '收藏时间',
  PRIMARY KEY (user_id, story_id),
  KEY idx_story (story_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='收藏';

CREATE TABLE IF NOT EXISTS story_stats_daily (
  story_id  BIGINT UNSIGNED NOT NULL COMMENT '故事ID',
  stat_date DATE            NOT NULL COMMENT '统计日期',
  plays     INT UNSIGNED    NOT NULL DEFAULT 0 COMMENT '当日播放次数',
  completes INT UNSIGNED    NOT NULL DEFAULT 0 COMMENT '当日完播次数',
  PRIMARY KEY (story_id, stat_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='每日播放统计（由 play_history 定时聚合）';

CREATE TABLE IF NOT EXISTS user_downloads (
  user_id       BIGINT UNSIGNED NOT NULL COMMENT '用户ID',
  package_id    BIGINT UNSIGNED NOT NULL COMMENT '离线包ID',
  downloaded_at DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '下载时间',
  PRIMARY KEY (user_id, package_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户离线包下载记录';

-- ============================================================
-- 四、行程与 AI 路线
-- ============================================================

CREATE TABLE IF NOT EXISTS trips (
  id         BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '行程ID',
  user_id    BIGINT UNSIGNED NOT NULL COMMENT '用户ID',
  name       VARCHAR(64)     NOT NULL DEFAULT '我的行程' COMMENT '行程名',
  city       VARCHAR(32)     NULL COMMENT '主要城市',
  created_at DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  PRIMARY KEY (id),
  KEY idx_user (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='行程';

CREATE TABLE IF NOT EXISTS trip_items (
  trip_id  BIGINT UNSIGNED  NOT NULL COMMENT '行程ID',
  story_id BIGINT UNSIGNED  NOT NULL COMMENT '故事ID',
  sort     TINYINT UNSIGNED NOT NULL DEFAULT 0 COMMENT '顺序',
  added_at DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '加入时间',
  PRIMARY KEY (trip_id, story_id),
  KEY idx_story (story_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='行程中的故事';

CREATE TABLE IF NOT EXISTS ai_routes (
  id          BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '路线ID',
  trip_id     BIGINT UNSIGNED NOT NULL COMMENT '行程ID',
  route_json  JSON            NOT NULL COMMENT '路线 JSON：点位顺序、连线、每段预估时间',
  est_minutes INT UNSIGNED    NULL COMMENT '总预估时间（分钟）',
  created_at  DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '生成时间',
  PRIMARY KEY (id),
  KEY idx_trip (trip_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='AI 漫步路线';

-- ============================================================
-- 五、离线包与 AI 生产任务
-- ============================================================

CREATE TABLE IF NOT EXISTS offline_packages (
  id           BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '离线包ID',
  city         VARCHAR(32)     NOT NULL COMMENT '城市',
  version      INT UNSIGNED    NOT NULL COMMENT '版本号',
  story_ids    JSON            NOT NULL COMMENT '包含的故事ID数组',
  size_bytes   BIGINT UNSIGNED NOT NULL COMMENT '包大小（字节）',
  download_url VARCHAR(500)    NOT NULL COMMENT '下载地址',
  PRIMARY KEY (id),
  UNIQUE KEY uk_city (city)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='离线包';

CREATE TABLE IF NOT EXISTS ai_tasks (
  id             BIGINT UNSIGNED NOT NULL AUTO_INCREMENT COMMENT '任务ID',
  story_id       BIGINT UNSIGNED NULL COMMENT '故事ID（改写/配音完成后回填）',
  type           ENUM('extract','rewrite','tts') NOT NULL COMMENT '任务类型：结构化提取/故事化改写/语音合成',
  input_material JSON            NULL COMMENT '输入素材（史料原文等）',
  status         ENUM('pending','running','done','failed') NOT NULL DEFAULT 'pending' COMMENT '任务状态',
  result         JSON            NULL COMMENT '结果（改写文本或音频地址）',
  created_at     DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  PRIMARY KEY (id),
  KEY idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='AI 内容生产任务';
