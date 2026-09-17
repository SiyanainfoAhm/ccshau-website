const slug = process.argv[2] || "mous-hisar-washington";
const html = await (
  await fetch(`https://hau.ac.in/international-tieup/${slug}`)
).text();
const markers = [
  "Memorandum",
  "tieups/",
  "card-title",
  "single-",
  "page-content",
  "For Cooperation",
];
for (const m of markers) {
  const i = html.indexOf(m);
  console.log(m, i);
}
const i = html.search(/Memorandum of/i);
console.log("---around Memorandum---");
console.log(html.slice(Math.max(0, i - 200), i + 1500));
