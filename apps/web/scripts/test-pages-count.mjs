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

const users = [
  ["super_admin", "test.superadmin@ccshau.test"],
  ["dept_admin", "test.deptadmin@ccshau.test"],
  ["editor", "test.editor@ccshau.test"],
  ["viewer", "test.viewer@ccshau.test"],
  ["college_admin", "test.collegeadmin@ccshau.test"],
  ["college_editor", "test.collegeeditor@ccshau.test"],
  ["college_viewer", "test.collegeviewer@ccshau.test"],
];

async function login(email) {
  const jar = new Map();
  const sb = createServerClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    cookies: {
      getAll: () => [...jar].map(([name, value]) => ({ name, value })),
      setAll: (cookies) => cookies.forEach(({ name, value }) => jar.set(name, value)),
    },
  });
  const { error } = await sb.auth.signInWithPassword({ email, password: "Admin@123" });
  if (error) return { error: error.message };
  return { jar };
}

async function pagesInfo(jar) {
  const res = await fetch("http://localhost:3000/admin/pages", {
    headers: { Cookie: [...jar].map(([n, v]) => `${n}=${v}`).join("; ") },
    redirect: "manual",
  });
  const body = await res.text();
  const err = body.includes("Runtime Error") || body.includes("Insufficient permissions");
  const m = body.match(/(\d+)\s+of\s+(\d+)\s+pages/);
  const empty = body.includes("No pages yet");
  return { status: res.status, err, total: m ? Number(m[2]) : empty ? 0 : null };
}

for (const [role, email] of users) {
  const s = await login(email);
  if (s.error) {
    console.log(`${role}|${email}|LOGIN_FAIL|${s.error}`);
    continue;
  }
  const p = await pagesInfo(s.jar);
  console.log(`${role}|${email}|Pages|HTTP ${p.status}|count=${p.total ?? "?"}|${p.err ? "ERROR" : "OK"}`);
}
