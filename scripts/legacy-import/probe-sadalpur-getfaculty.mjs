const html = await (
  await fetch("https://hau.ac.in/college/krishi-vigyan-kendra-sadalpur-hisar")
).text();

const idx = html.indexOf("getFaculty");
console.log("getFaculty context:", html.slice(idx - 200, idx + 800));

// Find ajax URLs
const ajax = [...html.matchAll(/(?:url|href|fetch)\s*[:=]\s*['"]([^'"]+)['"]/gi)].map((m) => m[1]);
console.log("urls in page", [...new Set(ajax)].filter((u) => /faculty|user|college/i.test(u)));

// Search faculty-detail section
const fIdx = html.indexOf("faculty-detail");
if (fIdx !== -1) console.log("faculty-detail:", html.slice(fIdx, fIdx + 3000));

// Search section-paris (faculty table?)
const pIdx = html.indexOf("section-paris");
if (pIdx !== -1) console.log("section-paris:", html.slice(pIdx, pIdx + 5000));
