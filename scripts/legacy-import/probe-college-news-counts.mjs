import mysql from "mysql2/promise";

const conn = await mysql.createConnection({
  host: "127.0.0.1",
  port: 3306,
  user: "Admin",
  password: "Admin@123",
  database: "hau_db",
});

const [rows] = await conn.query(`
  SELECT c.college_id, c.college_name, c.college_slug, c.type, c.college_status,
    SUM(n.category_id = 5) AS news_n,
    SUM(n.category_id = 27) AS student_n,
    COUNT(n.id) AS total_n
  FROM hau_college c
  LEFT JOIN hau_notifications n
    ON n.college_id = c.college_id AND n.status = 1 AND n.category_id IN (5, 27)
  WHERE c.college_status = '1'
  GROUP BY c.college_id, c.college_name, c.college_slug, c.type, c.college_status
  HAVING total_n > 0 OR c.type IN (1, 2, 3)
  ORDER BY c.type, c.college_name
`);

for (const r of rows) {
  console.log(
    `${r.college_id}\ttype=${r.type}\tnews=${r.news_n}\tstudent=${r.student_n}\t${r.college_slug}`,
  );
}

const [dsw] = await conn.query(
  `SELECT college_id, college_name, college_slug, type, college_status FROM hau_college WHERE college_id IN (21,20,54) OR college_slug LIKE '%student%' OR college_slug LIKE '%hrm%' OR college_name LIKE '%HRM%' OR college_name LIKE '%Human Resource%'`,
);
console.log("extra:", dsw);

const [dor] = await conn.query(
  `SELECT id, category_id, notification_name, notification_link, notification_file, created_at, updated_at
   FROM hau_notifications WHERE college_id = 5 AND status = 1 AND category_id IN (5,27)
   ORDER BY id DESC`,
);
console.log("DOR:", dor);

await conn.end();
