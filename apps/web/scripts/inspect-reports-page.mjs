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

const jar = new Map();
const sb = createServerClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
  cookies: {
    getAll: () => [...jar.entries()].map(([name, value]) => ({ name, value })),
    setAll: (cookies) => cookies.forEach(({ name, value }) => jar.set(name, value)),
  },
});

await sb.auth.signInWithPassword({ email: "test.viewer@ccshau.test", password: "Admin@123" });
const cookie = [...jar.entries()].map(([n, v]) => `${n}=${v}`).join("; ");
const res = await fetch("http://localhost:3000/admin/reports", { headers: { Cookie: cookie } });
const body = await res.text();
console.log("status", res.status);
console.log("has summary", body.includes("Content & activity summary"));
console.log("has reports badge", body.includes("Read-only reports"));
console.log("has error", body.includes("Runtime Error"));
console.log(body.slice(0, 1500));
