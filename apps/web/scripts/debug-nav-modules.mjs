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

async function sidebarModules(jar) {
  const res = await fetch("http://localhost:3000/admin", {
    headers: { Cookie: [...jar].map(([n, v]) => `${n}=${v}`).join("; ") },
  });
  const body = await res.text();
  const navMatch = body.match(/<nav[^>]*class="[^"]*flex-1[^"]*"[^>]*>([\s\S]*?)<\/nav>/i);
  const nav = navMatch?.[1] ?? body;
  const modules = ["Pages", "News & Notices", "Circulars", "Tenders", "Downloads", "Media", "Feedback"];
  return modules.filter((m) => nav.includes(m));
}

const registrar = await login("test.deptadmin@ccshau.test");
const purchase = await login("test.dept.purchase-tender@ccshau.test");
console.log("Registrar dept admin nav:", (await sidebarModules(registrar)).join(", "));
console.log("Purchase/Tender nav:", (await sidebarModules(purchase)).join(", "));
