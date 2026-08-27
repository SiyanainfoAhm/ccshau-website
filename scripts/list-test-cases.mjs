import fs from "node:fs";
import path from "node:path";

function walk(dir, acc = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, acc);
    else if (e.name.endsWith(".test.ts")) acc.push(p);
  }
  return acc;
}

const root = path.resolve("apps/web/src");
const files = walk(root).sort();
const suites = [];

for (const file of files) {
  const text = fs.readFileSync(file, "utf8");
  const rel = file.replace(/\\/g, "/").split("/apps/web/")[1] ?? file;
  const describes = [...text.matchAll(/describe\(\s*(['"`])([\s\S]*?)\1/g)].map(
    (m) => m[2].replace(/\s+/g, " ").trim().replace(/[—–]/g, "-"),
  );
  const its = [...text.matchAll(/\bit\(\s*(['"`])([\s\S]*?)\1/g)].map((m) =>
    m[2].replace(/\s+/g, " ").trim().replace(/[—–]/g, "-"),
  );
  suites.push({ rel, describes, its, count: its.length });
}

const out = {
  generatedAt: new Date().toISOString(),
  totalFiles: suites.length,
  totalTests: suites.reduce((a, s) => a + s.count, 0),
  suites,
};

fs.mkdirSync("Documents", { recursive: true });
fs.writeFileSync(
  "Documents/unit-test-cases.json",
  JSON.stringify(out, null, 2),
);

console.log(`${out.totalFiles} files, ${out.totalTests} tests`);
