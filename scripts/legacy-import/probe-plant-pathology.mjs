import mysql from "mysql2/promise";

const c = await mysql.createConnection({
  host: "127.0.0.1",
  user: "Admin",
  password: "Admin@123",
  database: "hau_db",
});

const [r] = await c.query(
  `SELECT id, department_name FROM hau_college_departments
   WHERE college_id = 2 AND LOWER(department_name) LIKE '%plant%path%'`,
);
console.log("depts:", r);

const deptId = r[0]?.id;
if (deptId) {
  const [tabs] = await c.query(
    `SELECT md.label, md.link, md.page_id,
            COALESCE(cms.file, cms_slug.file) AS file,
            LENGTH(COALESCE(cms.page_content, cms_slug.page_content, '')) AS content_len
     FROM hau_menu m
     JOIN hau_menu_detail md ON md.menu_id = m.menu_id
     LEFT JOIN hau_cms cms ON cms.id = md.page_id
     LEFT JOIN hau_cms cms_slug
       ON cms_slug.page_slug = CASE
         WHEN md.link LIKE 'page/%' THEN SUBSTRING(md.link, 6)
         ELSE NULL
       END
     WHERE m.college_id = 2 AND m.department_id = ?
       AND (m.menu_type LIKE '%left%' OR m.menu_type_bk LIKE '%left%')
     ORDER BY md.display_order, md.id`,
    [deptId],
  );
  console.log(JSON.stringify(tabs, null, 2));
}

await c.end();
