const r = await fetch("https://hau.ac.in/page/controller-of-examination", {
  headers: { "User-Agent": "Mozilla/5.0" },
});
const h = await r.text();
const imgs = [
  ...h.matchAll(/<img[^>]+src="([^"]+)"[^>]*>/gi),
].map((m) => m[0]);
console.log("img tags count", imgs.length);
for (const tag of imgs) {
  if (/logo|favicon|charan|owl|slider/i.test(tag)) continue;
  console.log(tag.slice(0, 300));
}

const block = h.match(/CONTROLLER OF EXAMINATIONS[\s\S]{0,3500}/i);
console.log("\n--- block ---\n", block?.[0]?.slice(0, 2500));

// Try getPageDetail from JS files
const jsMatches = [...h.matchAll(/src="(https:\/\/hau\.ac\.in\/public\/js\/[^"]+)"/g)].map(
  (m) => m[1],
);
console.log("js", jsMatches);
for (const js of jsMatches.slice(0, 8)) {
  const t = await (await fetch(js)).text();
  if (t.includes("getPageDetail")) {
    const snip = t.match(/getPageDetail[\s\S]{0,500}/);
    console.log("found in", js);
    console.log(snip?.[0]);
  }
}
