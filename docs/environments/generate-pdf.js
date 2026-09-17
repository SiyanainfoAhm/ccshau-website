const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer');

(async () => {
  const htmlPath = path.resolve(__dirname, 'CCSHAU-Dev-UAT-Production-Rollback-Plan.html');
  const pdfPath = path.resolve(__dirname, 'CCSHAU-Dev-UAT-Production-Rollback-Plan.pdf');
  const fileUrl = 'file:///' + htmlPath.replace(/\\/g, '/');

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });
  const page = await browser.newPage();
  await page.goto(fileUrl, { waitUntil: 'networkidle0', timeout: 120000 });
  await page.waitForFunction(() => document.querySelectorAll('.mermaid svg').length >= 4, {
    timeout: 60000,
  });
  await new Promise((r) => setTimeout(r, 1500));
  await page.pdf({
    path: pdfPath,
    format: 'A4',
    printBackground: true,
    margin: { top: '16mm', right: '14mm', bottom: '16mm', left: '14mm' },
  });
  await browser.close();
  if (!fs.existsSync(pdfPath)) throw new Error('PDF not created');
  console.log('PDF created:', pdfPath);
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
