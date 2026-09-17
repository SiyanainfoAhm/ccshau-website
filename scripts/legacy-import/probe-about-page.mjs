import mysql from "mysql2/promise";

const conn = await mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "Admin@123",
  database: "hau_db",
});

const [rows] = await conn.query(
  `SELECT page_slug, page_title, CHAR_LENGTH(page_content) AS len,
          LEFT(page_content, 1200) AS preview
   FROM hau_cms
   WHERE page_slug IN ('home', 'about-us', 'about-us-1', 'about-us-3')
   ORDER BY len DESC`,
);

console.log(JSON.stringify(rows, null, 2));
await conn.end();
