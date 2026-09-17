import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const html = await (
  await fetch("https://hau.ac.in/page/international-linkage")
).text();

const idx = html.indexOf("international-tieup");
console.log("first idx", idx);
console.log(html.slice(Math.max(0, idx - 500), idx + 800));

mkdirSync(join(__dirname, "reports"), { recursive: true });
writeFileSync(join(__dirname, "reports/international-linkage-snippet.html"), html);
console.log("saved full html", html.length);
