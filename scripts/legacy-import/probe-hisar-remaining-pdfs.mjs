/**
 * Probe remaining Hisar tabs that still lack PDF content.
 */
import mysql from "mysql2/promise";

const TARGETS = [
  ["hisar-agronomy", "Thurst Area", 1], // agronomy dept id? probe by name
];

const conn = await mysql.createConnection({
  host: "127.0.0.1",
  user: "Admin",
  password: "Admin@123",
  database: "hau_db",
});

const checks = [
  { dept: "Agronomy", labels: ["Thurst Area", "Thrust Area"] },
  { dept: "Bajra Section", labels: ["Thrust Area", "Awards and Honors", "Ongoing Research"] },
  { dept: "Business Management", labels: ["Infrastructure", "Publications", "Awards", "Courses"] },
  {
    dept: "Medicinal, Aromatic And Potential Crops Section",
    labels: ["Courses offered", "Alumni"],
  },
  { dept: "Oil Seeds Section", labels: ["Ongoing Research"] },
  { dept: "Teaching Section", labels: ["Thrust Area", "Ongoing Research", "Awards"] },
  { dept: "Vegetable Science", labels: ["Seminar", "Credit load"] },
  { dept: "Wheat and Barley Section", labels: ["Thrust Area", "Ongoining", "Ongoing"] },
  { dept: "Soil Science", labels: ["Awards"] },
  { dept: "Agricultural Economics", labels: ["Teaching", "Alumni", "Retiree"] },
];

for (const c of checks) {
  const [depts] = await conn.query(
    `SELECT id, department_name FROM hau_college_departments
     WHERE college_id = 2 AND department_name LIKE ?`,
    [`%${c.dept.split(" ")[0]}%`],
  );
  // tighter match
  const dept = depts.find(
    (d) => d.department_name.toLowerCase() === c.dept.toLowerCase(),
  ) || depts.find((d) => d.department_name.toLowerCase().includes(c.dept.toLowerCase().slice(0, 12)));
  if (!dept) {
    console.log(`NO DEPT for ${c.dept}`, depts.map((d) => d.department_name));
    continue;
  }
  const [rows] = await conn.query(
    `SELECT md.label, COALESCE(cms.file, cms_slug.file) AS file,
            LENGTH(COALESCE(cms.page_content, cms_slug.page_content, '')) AS content_len
     FROM hau_menu m
     JOIN hau_menu_detail md ON md.menu_id = m.menu_id
     LEFT JOIN hau_cms cms ON cms.id = md.page_id
     LEFT JOIN hau_cms cms_slug
       ON cms_slug.page_slug = CASE WHEN md.link LIKE 'page/%' THEN SUBSTRING(md.link, 6) ELSE NULL END
     WHERE m.college_id = 2 AND m.department_id = ?
       AND (m.menu_type LIKE '%left%' OR m.menu_type_bk LIKE '%left%')
     ORDER BY md.display_order`,
    [dept.id],
  );
  console.log(`\n=== ${dept.department_name} (id=${dept.id}) ===`);
  for (const row of rows) {
    const want = c.labels.some((l) =>
      String(row.label).toLowerCase().includes(l.toLowerCase()),
    );
    if (want || !row.file) {
      console.log({
        label: row.label,
        file: row.file,
        contentLen: row.content_len,
        highlight: want,
      });
    }
  }
}

await conn.end();
