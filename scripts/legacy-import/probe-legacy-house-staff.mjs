import mysql from "mysql2/promise";

const c = await mysql.createConnection({
  host: "127.0.0.1",
  user: "Admin",
  password: "Admin@123",
  database: "hau_db",
});

const [tables] = await c.query("SHOW TABLES");
const names = tables.map((t) => Object.values(t)[0]);
console.log(names.filter((n) => /user|staff|facul|dept|hod|college/i.test(n)));

async function safe(sql, params = []) {
  try {
    const [rows] = await c.query(sql, params);
    return rows;
  } catch (e) {
    console.log("FAIL", sql.slice(0, 80), e.message);
    return null;
  }
}

console.log(
  "users_roles",
  await safe("DESCRIBE hau_users_roles"),
);
console.log(
  "sample hur",
  await safe("SELECT * FROM hau_users_roles LIMIT 3"),
);
console.log(
  "hur 103",
  await safe("SELECT * FROM hau_users_roles WHERE department_id=103"),
);
console.log(
  "hur 53",
  await safe("SELECT * FROM hau_users_roles WHERE college_id=53 LIMIT 20"),
);

// search name patterns in any user-dept mapping
for (const t of names.filter((n) => /user/i.test(n))) {
  const cols = await safe(`DESCRIBE \`${t}\``);
  if (!cols) continue;
  const fields = cols.map((x) => x.Field);
  if (fields.includes("department_id")) {
    const rows = await safe(
      `SELECT * FROM \`${t}\` WHERE department_id=103 LIMIT 20`,
    );
    console.log(t, "dept103", rows);
  }
}

// college faculty endpoint source?
const [imgCols] = await c.query("SHOW TABLES LIKE '%image%'");
console.log("image tables", imgCols);

const usersLike = await safe(
  `SELECT user_id, name, email, user_type FROM tbl_users
   WHERE name LIKE '%allot%' OR email LIKE '%allot%' OR name LIKE '%estate%'
   OR email LIKE '%deo@%' OR email LIKE '%eocum%' LIMIT 30`,
);
console.log("usersLike", usersLike);

await c.end();
