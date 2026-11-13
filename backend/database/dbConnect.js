const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const mysql = require('mysql2');

const databaseUrl = process.env.DATABASE_URL || process.env.MYSQL_URL;

let poolConfig = {
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};

if (databaseUrl) {
  poolConfig.uri = databaseUrl;
} else if (process.env.MYSQLHOST || process.env.DB_HOST) {
  poolConfig.host = process.env.MYSQLHOST || process.env.DB_HOST;
  poolConfig.user = process.env.MYSQLUSER || process.env.DB_USER || 'root';
  poolConfig.password = process.env.MYSQLPASSWORD || process.env.DB_PASSWORD;
  poolConfig.database = process.env.MYSQLDATABASE || process.env.DB_NAME || 'railway';
  poolConfig.port = Number(process.env.MYSQLPORT || process.env.DB_PORT || 3306);
} else {
  console.warn("⚠️ Warning: DATABASE_URL is not set.");
  console.warn("👉 Please set: DATABASE_URL=mysql://root:YOUR_PASSWORD@switchback.proxy.rlwy.net:11739/railway");
  poolConfig.uri = 'mysql://root:placeholder@switchback.proxy.rlwy.net:11739/railway';
}

const db = mysql.createPool(poolConfig);

db.getConnection((err, connection) => {
  if (err) {
    console.error("❌ Railway MySQL Connection Error:", err.message);
    if (!databaseUrl) {
      console.error("👉 Reason: DATABASE_URL is missing in backend/.env. Add your rotated password to connect.");
    }
    return;
  }
  console.log("✅ Connected to Railway MySQL Database (railway) via Connection Pool");
  connection.release();
});

module.exports = db;

