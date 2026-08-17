/**
 * 初始化数据库：建库 → 执行 schema.sql 建表 → 灌入种子数据
 *
 * 用法（在 server/ 目录下）：
 *   npm run db:init
 *
 * 幂等：可重复执行（CREATE DATABASE/TABLE 均带 IF NOT EXISTS，种子为 upsert）。
 */
const fs = require("fs");
const path = require("path");
const mysql = require("mysql2/promise");
const { db } = require("../src/config");

const SCHEMA_FILE = path.join(__dirname, "schema.sql");

/** 库名只允许字母/数字/下划线，防止拼接进 SQL 时注入 */
function validateDbName(name) {
  if (!/^[A-Za-z0-9_]+$/.test(name)) {
    throw new Error(`数据库名「${name}」不合法，只允许字母、数字、下划线`);
  }
}

/**
 * 按分号切分 SQL 语句：状态机识别 单引号/双引号/反引号字符串、
 * `--` 与 `#` 行注释、`/* *​/` 块注释 —— 字符串或注释里的分号不会被误切。
 */
function splitSqlStatements(sql) {
  const stmts = [];
  let cur = "";
  let state = "normal"; // normal | sq | dq | bt | lineCmt | blockCmt
  for (let i = 0; i < sql.length; i++) {
    const ch = sql[i];
    const next = sql[i + 1];
    if (state === "normal") {
      if (ch === "'") { state = "sq"; cur += ch; }
      else if (ch === '"') { state = "dq"; cur += ch; }
      else if (ch === "`") { state = "bt"; cur += ch; }
      else if (ch === "-" && next === "-") { state = "lineCmt"; cur += "--"; i++; }
      else if (ch === "#") { state = "lineCmt"; cur += ch; }
      else if (ch === "/" && next === "*") { state = "blockCmt"; cur += "/*"; i++; }
      else if (ch === ";") {
        if (cur.trim()) stmts.push(cur.trim());
        cur = "";
      } else cur += ch;
    } else if (state === "sq" || state === "dq" || state === "bt") {
      cur += ch;
      const closer = state === "sq" ? "'" : state === "dq" ? '"' : "`";
      if (ch === "\\" && next) { cur += next; i++; } // 跳过转义字符
      else if (ch === closer) state = "normal";
    } else if (state === "lineCmt") {
      cur += ch;
      if (ch === "\n") state = "normal";
    } else if (state === "blockCmt") {
      cur += ch;
      if (ch === "*" && next === "/") { cur += "/"; i++; state = "normal"; }
    }
  }
  if (cur.trim()) stmts.push(cur.trim());
  return stmts;
}

async function init() {
  validateDbName(db.database);

  // 1. 先不选库连上 MySQL，建库
  const conn = await mysql.createConnection({
    host: db.host,
    port: db.port,
    user: db.user,
    password: db.password,
    charset: "utf8mb4",
  });
  try {
    await conn.query(
      `CREATE DATABASE IF NOT EXISTS \`${db.database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
    );
    console.log(`数据库 ${db.database} 已就绪`);

    // 2. 切到目标库，执行 schema.sql
    await conn.changeUser({ database: db.database });
    const schema = fs.readFileSync(SCHEMA_FILE, "utf8");
    const stmts = splitSqlStatements(schema);
    for (const stmt of stmts) await conn.query(stmt);
    const tableCount = stmts.filter((s) => /CREATE TABLE/i.test(s)).length;
    console.log(`${tableCount} 张表创建完成（共执行 ${stmts.length} 条语句）`);
  } finally {
    await conn.end();
  }

  // 3. 种子数据（复用连接池）
  const { seed } = require("./seed");
  await seed();
}

if (require.main === module) {
  init()
    .then(() => process.exit(0))
    .catch((e) => {
      console.error("初始化失败：" + e.message);
      console.error("提示：请确认 MySQL 服务已启动，且 server/.env 中的 DB_PASSWORD 正确。");
      process.exit(1);
    });
}

module.exports = { init, splitSqlStatements };
