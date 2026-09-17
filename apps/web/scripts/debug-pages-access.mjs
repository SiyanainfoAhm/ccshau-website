import { createServerClient } from "@supabase/ssr";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const env = Object.fromEntries(
  readFileSync(resolve(__dirname, "../.env.local"), "utf8")
    .split("\n")
    .filter((l) => l && !l.startsWith("#") && l.includes("="))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^"|"$/g, "")];
    }),
);

async function login(email) {
  const jar = new Map();
  const sb = createServerClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    cookies: {
      getAll: () => [...jar].map(([n, v]) => ({ name: n, value: v })),
      setAll: (c) => c.forEach(({ name, value }) => jar.set(name, value)),
    },
  });
  await sb.auth.signInWithPassword({ email, password: "Admin@123" });
  return jar;
}

const jar = await login("test.dept.purchase-tender@ccshau.test");
const res = await fetch("http://localhost:3000/admin/pages", {
  headers: { Cookie: [...jar].map(([n, v]) => `${n}=${v}`).join("; ") },
  redirect: "manual",
});
console.log("status", res.status, "location", res.headers.get("location"));
const body = await res.text();
console.log("has Search by title", body.includes("Search by title"));
console.log("has college-of-agriculture slug", body.includes("college-of-agriculture"));
console.log("has College of Agriculture text", /College of Agriculture/i.test(body));
const tableMatch = body.match(/<tbody[^>]*>([\s\S]*?)<\/tbody>/i);
if (tableMatch) {
  console.log("tbody snippet:", tableMatch[1].replace(/\s+/g, " ").slice(0, 400));
} else {
  console.log("no tbody");
}
