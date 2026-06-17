require("dotenv").config();
const mysql = require("mysql2");

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

function testConnection(retries = 3) {
  pool.getConnection((err, connection) => {
    if (err) {
      console.error(`❌ DB Connection Failed. Retries left: ${retries}`);

      if (retries > 0) {
        setTimeout(() => testConnection(retries - 1), 1000);
      } else {
        console.error("❌ All retries failed. Exiting...");
        process.exit(1);
      }

      return;
    }

    console.log("✅ Connected to MySQL DB!");
    connection.release();
  });
}

testConnection();

module.exports = pool;
