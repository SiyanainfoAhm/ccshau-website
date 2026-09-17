import { createClient } from "@supabase/supabase-js";
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

const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const { data: depts } = await admin.from("ccshau_departments").select("id, slug, name_en");
const { data: modules } = await admin.from("ccshau_department_modules").select("department_id, module");
const { data: news } = await admin.from("ccshau_news").select("id, title_en, department_id").limit(20);
const { data: feedback } = await admin
  .from("ccshau_feedback")
  .select("id, subject, department_id")
  .limit(20);

const restricted = new Set((modules ?? []).map((m) => m.department_id));
console.log("Departments:", depts?.length);
console.log("With module restrictions:", restricted.size);
console.log(
  "Unrestricted depts:",
  (depts ?? []).filter((d) => !restricted.has(d.id)).map((d) => d.slug).join(", "),
);
console.log("News sample dept_ids:", [...new Set((news ?? []).map((n) => n.department_id))].length, "unique");
console.log(
  "Feedback null department_id count:",
  (feedback ?? []).filter((f) => !f.department_id).length,
  "/",
  feedback?.length ?? 0,
);
