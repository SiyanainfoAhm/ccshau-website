/**
 * Probe legacy Nehru Library (college_id=54) menus and CMS.
 */
import mysql from "mysql2/promise";

const conn = await mysql.createConnection({
  host: "127.0.0.1",
  user: "Admin",
  password: "Admin@123",
  database: "hau_db",
});

const [college] = await conn.query(
  `SELECT college_id, college_name, college_slug FROM hau_college WHERE college_id = 54 OR college_slug LIKE '%librar%' OR college_name LIKE '%Nehru%' OR college_name LIKE '%Library%'`,
);
console.log("college:", college);

const [menus] = await conn.query(
  `SELECT menu_id, menu_name, menu_type, menu_status, department_id, college_id
   FROM hau_menu WHERE college_id = 54 ORDER BY menu_id`,
);
console.log("\nmenus:", menus);

for (const m of menus) {
  const [details] = await conn.query(
    `SELECT md.id, md.label, md.link, md.display_order, md.page_id, md.parent,
            COALESCE(cms.file, cms_slug.file) AS file,
            LENGTH(COALESCE(cms.page_content, cms_slug.page_content, '')) AS content_len,
            LEFT(COALESCE(cms.page_content, cms_slug.page_content, ''), 80) AS preview
     FROM hau_menu_detail md
     LEFT JOIN hau_cms cms ON cms.id = md.page_id
     LEFT JOIN hau_cms cms_slug
       ON cms_slug.page_slug = CASE WHEN md.link LIKE 'page/%' THEN SUBSTRING(md.link, 6) ELSE NULL END
     WHERE md.menu_id = ?
     ORDER BY md.display_order, md.id`,
    [m.menu_id],
  );
  console.log(`\n=== menu ${m.menu_id} ${m.menu_name} (${m.menu_type}) ===`);
  for (const d of details) {
    console.log({
      label: d.label,
      link: d.link,
      parent: d.parent,
      file: d.file,
      contentLen: d.content_len,
      preview: String(d.preview || "").replace(/\s+/g, " ").slice(0, 60),
    });
  }
}

const [depts] = await conn.query(
  `SELECT id, department_name FROM hau_college_departments WHERE college_id = 54`,
);
console.log("\ndepts:", depts);

await conn.end();
