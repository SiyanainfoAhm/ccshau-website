import mysql from "mysql2/promise";

const conn = await mysql.createConnection({
  host: "127.0.0.1",
  user: "Admin",
  password: "Admin@123",
  database: "hau_db",
  charset: "utf8mb4",
});

const [rows] = await conn.query(
  `SELECT id, notification_name, HEX(notification_name) AS hex
   FROM hau_notifications
   WHERE college_id = 7 AND status = 1 AND category_id = 5
   ORDER BY id DESC`,
);
for (const r of rows) {
  console.log(r.id, JSON.stringify(r.notification_name), String(r.hex).slice(0, 100));
}
await conn.end();
