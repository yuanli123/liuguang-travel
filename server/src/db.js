/**
 * MySQL 连接池（mysql2/promise）
 * charset 必须 utf8mb4，否则中文注释与数据会乱码
 */
const mysql = require("mysql2/promise");
const { db } = require("./config");

const pool = mysql.createPool({
  ...db,
  charset: "utf8mb4",
  waitForConnections: true,
  connectionLimit: 10,
});

module.exports = pool;
