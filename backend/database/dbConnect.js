const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const mysql = require('mysql2');

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.warn("⚠️ Warning: DATABASE_URL is not set in backend/.env.");
  console.warn("👉 Please set: DATABASE_URL=mysql://root:YOUR_PASSWORD@switchback.proxy.rlwy.net:11739/railway");
}

const db = mysql.createPool({
  uri: databaseUrl || 'mysql://root:placeholder@switchback.proxy.rlwy.net:11739/railway',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

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

