import mysql from "mysql2/promise";

const c = await mysql.createConnection({
  host: "127.0.0.1",
  user: "Admin",
  password: "Admin@123",
  database: "hau_db",
});

const [u] = await c.query(
  "SELECT user_id, name, email, phone, user_type, status FROM tbl_users WHERE user_id IN (343, 701)",
);
console.log("tbl_users", u);

const [u2] = await c.query(
  "SELECT * FROM users WHERE id IN (343,701) LIMIT 5",
).catch(async (e) => {
  const [cols] = await c.query("DESCRIBE users");
  console.log("users cols", cols.map((x) => x.Field).slice(0, 20));
  return [null];
});
console.log("users table", u2);

// How does legacy show faculty on department page?
// Check if there's designation in another table
const [tables] = await c.query("SHOW TABLES");
const names = tables.map((t) => Object.values(t)[0]);
for (const t of names) {
  const [cols] = await c.query(`DESCRIBE \`${t}\``);
  const fields = cols.map((x) => x.Field);
  if (
    fields.includes("user_id") &&
    (fields.includes("designation") ||
      fields.includes("image") ||
      fields.includes("profile_image") ||
      fields.includes("photo"))
  ) {
    console.log("candidate", t, fields.slice(0, 20).join(", "));
    const [rows] = await c.query(
      `SELECT * FROM \`${t}\` WHERE user_id IN (343,701) LIMIT 5`,
    ).catch(() => [[]]);
    if (rows?.length) console.log(" rows", rows);
  }
}

await c.end();
