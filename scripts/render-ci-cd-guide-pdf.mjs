/**
 * Render Documents/ci-cd-step-by-step-guide.md → PDF via md-to-pdf.
 */
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const md = path.join(root, "Documents/ci-cd-step-by-step-guide.md");
const pdf = path.join(root, "Documents/ci-cd-step-by-step-guide.pdf");

execSync(`npx -y md-to-pdf "${md}"`, { cwd: root, stdio: "inherit" });

console.log(`Wrote ${path.relative(root, pdf)} (${Math.round(fs.statSync(pdf).size / 1024)} KB)`);
