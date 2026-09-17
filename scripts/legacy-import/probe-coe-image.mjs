const r = await fetch("https://hau.ac.in/college/registrar-office", {
  headers: { "User-Agent": "Mozilla/5.0" },
});
const h = await r.text();
console.log("status", r.status, "len", h.length);

const imgs = [
  ...h.matchAll(/src="(https?:\/\/[^"]+\.(?:jpe?g|png|webp)[^"]*)"/gi),
].map((m) => m[1]);
console.log("unique imgs", [...new Set(imgs)].join("\n"));

const idx = h.toLowerCase().indexOf("controller of examination");
console.log("coe idx", idx);
if (idx >= 0) {
  console.log(h.slice(Math.max(0, idx - 200), idx + 2500));
}

// Also try common storage path variants
const candidates = [
  "https://hau.ac.in/storage/app/uploads/2QC3I5u7Zo0RRcz65y7TM7n1zPAuMOU3V0BcvHdF.jpeg",
  "https://hau.ac.in/storage/app/media/2QC3I5u7Zo0RRcz65y7TM7n1zPAuMOU3V0BcvHdF.jpeg",
  "https://hau.ac.in/storage/app/uploads/public/2QC3I5u7Zo0RRcz65y7TM7n1zPAuMOU3V0BcvHdF.jpeg",
];
for (const u of candidates) {
  const res = await fetch(u, {
    method: "HEAD",
    headers: { "User-Agent": "Mozilla/5.0", Referer: "https://hau.ac.in/" },
  });
  console.log(res.status, u);
}
