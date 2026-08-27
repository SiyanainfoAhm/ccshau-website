import fs from "node:fs";

const data = JSON.parse(fs.readFileSync("Documents/unit-test-cases.json", "utf8"));

const categories = [
  {
    name: "Auth & CMS access",
    match: (rel) =>
      rel.includes("/auth/") ||
      rel.includes("cms-page-access") ||
      rel.includes("content-status"),
  },
  {
    name: "Validations (Zod)",
    match: (rel) => rel.includes("/validations/"),
  },
  {
    name: "HTML / CMS content",
    match: (rel) => rel.includes("/html/"),
  },
  {
    name: "Pages / routing / layout",
    match: (rel) =>
      rel.includes("/pages/") ||
      rel.includes("banners/") ||
      rel.includes("homepage-public"),
  },
  {
    name: "Storage / upload pipeline",
    match: (rel) => rel.includes("/storage/"),
  },
  {
    name: "Public HTTP smoke",
    match: (rel) => rel.includes("/smoke/") || rel.includes("public-pages.smoke"),
  },
  {
    name: "i18n / a11y / helpers",
    match: (rel) =>
      rel.includes("/i18n/") ||
      rel.includes("/a11y/") ||
      rel.includes("/utils/") ||
      rel.includes("/calendar/") ||
      rel.includes("/data/pagination") ||
      rel.includes("/social/") ||
      rel.includes("/media/") ||
      rel.includes("/faculty/"),
  },
];

const used = new Set();
const sections = categories.map((cat) => {
  const suites = data.suites.filter((s) => cat.match(s.rel) && !used.has(s.rel));
  suites.forEach((s) => used.add(s.rel));
  return { ...cat, suites };
});

const other = data.suites.filter((s) => !used.has(s.rel));
if (other.length) {
  sections.push({ name: "Other", suites: other });
}

let md = `# CCSHAU Unit & Smoke Test Cases

Generated: ${data.generatedAt}

| Metric | Value |
|--------|------:|
| Test files | ${data.totalFiles} |
| Test cases | ${data.totalTests} |
| Framework | Vitest 3 (\`apps/web\`) |

## How to run

\`\`\`bash
# From repo root
npm test
npm run test:smoke
\`\`\`

Optional HTTP smoke env:

- \`SMOKE_BASE_URL\` (default \`http://localhost:3000\`)
- \`SMOKE_COLLEGE_SLUG\` (default \`college-of-agriculture-hisar\`)

HTTP public-page smoke tests **skip** when the app server is not running.

## Summary by category

| Category | Files | Cases |
|----------|------:|------:|
`;

for (const sec of sections) {
  const files = sec.suites.length;
  const cases = sec.suites.reduce((a, s) => a + s.count, 0);
  md += `| ${sec.name} | ${files} | ${cases} |\n`;
}

md += `\n---\n`;

let caseNo = 1;
for (const sec of sections) {
  md += `\n## ${sec.name}\n\n`;
  for (const suite of sec.suites) {
    md += `### \`${suite.rel}\` (${suite.count})\n\n`;
    if (suite.describes.length) {
      md += `**Suites:** ${suite.describes.map((d) => `\`${d}\``).join(", ")}\n\n`;
    }
    md += `| # | Test case |\n|---|----------|\n`;
    for (const title of suite.its) {
      md += `| ${caseNo++} | ${title} |\n`;
    }
    md += `\n`;
  }
}

md += `---

## Out of scope (intentionally skipped)

- Login lockout tests
- Captcha tests
- Full Azure Blob upload (network) — validation + path + URL pipeline is covered without cloud I/O
- Supabase DB integration / e2e browser automation (Playwright)

## Source inventory

Machine-readable list: \`Documents/unit-test-cases.json\`
`;

fs.writeFileSync("Documents/Test-Cases.md", md);
console.log("Wrote Documents/Test-Cases.md");
