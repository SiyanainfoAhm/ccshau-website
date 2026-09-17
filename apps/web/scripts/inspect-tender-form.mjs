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
      getAll: () => [...jar.entries()].map(([name, value]) => ({ name, value })),
      setAll: (cookies) => cookies.forEach(({ name, value }) => jar.set(name, value)),
    },
  });
  const { error } = await sb.auth.signInWithPassword({ email, password: "Admin@123" });
  if (error) throw new Error(error.message);
  return [...jar.entries()].map(([n, v]) => `${n}=${v}`).join("; ");
}

const editorCookie = await login("test.editor@ccshau.test");
const res = await fetch("http://localhost:3000/admin/tenders/new", {
  headers: { Cookie: editorCookie },
});
const body = await res.text();
console.log("Editor /admin/tenders/new:", res.status);
console.log("Has Pending review option:", body.includes("Pending review"));
console.log("Has Open (live) option:", body.includes("Open (live)"));

const reviewerCookie = await login("test.reviewer@ccshau.test");
const reports = await fetch("http://localhost:3000/admin/reports", {
  headers: { Cookie: reviewerCookie },
});
const reportsBody = await reports.text();
console.log("\nReviewer /admin/reports:", reports.status);
console.log("Has Read-only reports:", reportsBody.includes("Read-only reports"));
console.log("Has Feedback inbox section:", reportsBody.includes("Feedback inbox"));
