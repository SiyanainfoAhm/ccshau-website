import mysql from "mysql2/promise";

const conn = await mysql.createConnection({
  host: "127.0.0.1",
  port: 3306,
  user: "Admin",
  password: "Admin@123",
  database: "hau_db",
});

const [cats] = await conn.query(
  "SELECT * FROM hau_notification_category ORDER BY category_id",
);
console.log("categories:", cats);

const [types] = await conn.query(
  `SELECT notification_type, COUNT(*) c FROM hau_notifications GROUP BY notification_type`,
);
console.log("types:", types);

const [byCollege] = await conn.query(
  `SELECT college_id, COUNT(*) c
   FROM hau_notifications
   WHERE status = 1 AND college_id > 0
   GROUP BY college_id
   ORDER BY c DESC
   LIMIT 30`,
);
console.log("by college:", byCollege);

const [hisar] = await conn.query(
  `SELECT id, category_id, notification_type, notification_name, notification_link, notification_file, notification_order, status
   FROM hau_notifications
   WHERE college_id = 2 AND status = 1
   ORDER BY category_id, notification_order, id DESC`,
);
console.log("\nHisar college_id=2 notifications:");
for (const r of hisar) {
  console.log(
    JSON.stringify({
      id: r.id,
      cat: r.category_id,
      type: r.notification_type,
      name: r.notification_name,
      link: r.notification_link,
      file: r.notification_file,
      order: r.notification_order,
    }),
  );
}

const [colleges] = await conn.query(
  `SELECT college_id, college_name, college_slug, type, college_status
   FROM hau_college
   WHERE college_status = '1' AND type IN (1, 2, 3)
   ORDER BY type, college_name`,
);
console.log("\nActive colleges/directorates by type:");
for (const c of colleges) {
  console.log(c.college_id, c.type, c.college_slug, c.college_name);
}

await conn.end();
