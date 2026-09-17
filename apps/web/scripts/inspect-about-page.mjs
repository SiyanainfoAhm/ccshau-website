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

const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
const { data, error } = await sb
  .from("ccshau_pages")
  .select("id, slug, title_en, excerpt_en, content_en")
  .eq("slug", "about")
  .maybeSingle();

if (error) {
  console.error(error);
  process.exit(1);
}

console.log(
  JSON.stringify(
    {
      id: data?.id,
      title: data?.title_en,
      excerpt: data?.excerpt_en,
      contentLen: data?.content_en?.length,
      content: data?.content_en,
    },
    null,
    2,
  ),
);
