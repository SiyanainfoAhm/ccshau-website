/**
 * Render Documents/ci-cd-pipeline.mmd → PNG → PDF (mmdc PDF output is often blank).
 */
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { PDFDocument } from "pdf-lib";

const root = path.resolve(import.meta.dirname, "..");
const mmd = path.join(root, "Documents/ci-cd-pipeline.mmd");
const png = path.join(root, "Documents/ci-cd-pipeline.png");
const pdf = path.join(root, "Documents/ci-cd-pipeline.pdf");

execSync(
  `npx -y @mermaid-js/mermaid-cli@11.4.0 -i "${mmd}" -o "${png}" -b white -w 2400 -H 3200`,
  { cwd: root, stdio: "inherit" },
);

const pngBytes = fs.readFileSync(png);
const doc = await PDFDocument.create();
const image = await doc.embedPng(pngBytes);
const { width, height } = image.scale(1);
const page = doc.addPage([width, height]);
page.drawImage(image, { x: 0, y: 0, width, height });
const pdfBytes = await doc.save();

const tmp = `${pdf}.tmp`;
fs.writeFileSync(tmp, pdfBytes);
try {
  fs.rmSync(pdf, { force: true });
  fs.renameSync(tmp, pdf);
} catch {
  fs.copyFileSync(tmp, pdf.replace(/\.pdf$/, "-v2.pdf"));
  fs.rmSync(tmp, { force: true });
  console.warn(`Could not overwrite ${pdf} (file may be open). Wrote -v2.pdf instead.`);
}

console.log(`Wrote ${path.relative(root, pdf)} (${Math.round(fs.statSync(pdf).size / 1024)} KB)`);
