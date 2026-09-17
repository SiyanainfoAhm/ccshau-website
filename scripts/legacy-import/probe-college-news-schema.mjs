import mysql from "mysql2/promise";

const conn = await mysql.createConnection({
  host: process.env.LEGACY_MYSQL_HOST || "127.0.0.1",
  port: Number(process.env.LEGACY_MYSQL_PORT || 3306),
  user: process.env.LEGACY_MYSQL_USER || "Admin",
  password: process.env.LEGACY_MYSQL_PASSWORD || "Admin@123",
  database: process.env.LEGACY_MYSQL_DATABASE || "hau_db",
});

const [tables] = await conn.query("SHOW TABLES");
const names = tables.map((r) => Object.values(r)[0]);
console.log(
  "matching tables:",
  names.filter((n) =>
    /notif|news|student|corner|college|ticker|document/i.test(n),
  ),
);

for (const t of [
  "hau_college",
  "hau_college_notifications",
  "hau_notifications",
  "hau_college_news",
  "hau_student_corner",
  "hau_college_documents",
  "hau_college_notification",
]) {
  if (!names.includes(t)) continue;
  const [cols] = await conn.query(`SHOW COLUMNS FROM \`${t}\``);
  console.log("\n==", t, "==");
  console.log(cols.map((c) => c.Field).join(", "));
  const [sample] = await conn.query(`SELECT * FROM \`${t}\` LIMIT 2`);
  console.log(JSON.stringify(sample, null, 2).slice(0, 2000));
}

await conn.end();
