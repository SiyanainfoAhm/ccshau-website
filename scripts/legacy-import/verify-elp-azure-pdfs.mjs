import { writeFileSync } from "node:fs";

const url =
  "http://localhost:3000/college/experiential-learning-programme";
const html = await (await fetch(url)).text();
const hau = html.match(/hau\.ac\.in[^"'\\\s>]*\.pdf/gi) || [];
const azure =
  html.match(/blob\.core\.windows\.net[^"'\\\s>]*\.pdf/gi) || [];
console.log(
  JSON.stringify(
    {
      hauPdfRefs: hau.length,
      azurePdfRefs: azure.length,
      sampleAzure: azure.slice(0, 2),
      sampleHau: hau.slice(0, 2),
    },
    null,
    2,
  ),
);
