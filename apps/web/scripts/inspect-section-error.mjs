import { createServerClient } from "@supabase/ssr";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const env = Object.fromEntries(
  readFileSync(resolve(__dirname, "../.env.local"), "utf8")
    .split("\n")
    .filter((l) => l && !l.startsWith("#") && l.includes("="))
    .map((line) => {
      const i = line.indexOf("=");
      return [line.slice(0, i).trim(), line.slice(i + 1).trim().replace(/^"|"$/g, "")];
    }),
);

const jar = new Map();
const sb = createServerClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
  cookies: {
    getAll: () => [...jar.entries()].map(([name, value]) => ({ name, value })),
    setAll: (cookies) => cookies.forEach(({ name, value }) => jar.set(name, value)),
  },
});

await sb.auth.signInWithPassword({
  email: "test.dept.purchase-tender@ccshau.test",
  password: "Admin@123",
});
const cookie = [...jar.entries()].map(([n, v]) => `${n}=${v}`).join("; ");

for (const path of ["/admin/tenders", "/admin/news", "/admin"]) {
  const res = await fetch(`http://localhost:3000${path}`, { headers: { Cookie: cookie }, redirect: "manual" });
  const body = res.status === 200 ? await res.text() : "";
  console.log(path, res.status, res.headers.get("location"));
  if (body) {
    const msg = body.match(/"message":"([^"]+)"/)?.[1] ?? body.match(/<pre[^>]*>([^<]+)/)?.[1];
    if (msg) console.log("  error:", msg.slice(0, 200));
  }
}
