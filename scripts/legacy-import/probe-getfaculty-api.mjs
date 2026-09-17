for (const js of [
  "https://hau.ac.in/public/js/home.js",
  "https://hau.ac.in/public/js/plugin.js",
  "https://hau.ac.in/public/js/theme.js",
]) {
  const text = await (await fetch(js)).text();
  const idx = text.indexOf("getFaculty");
  if (idx === -1) continue;
  console.log("\n===", js, "===");
  console.log(text.slice(idx, idx + 1200));
}

// Try common API endpoints
const endpoints = [
  "https://hau.ac.in/get-faculty/26/teaching_staff",
  "https://hau.ac.in/college/get-faculty/26/teaching_staff",
  "https://hau.ac.in/getFaculty/26/teaching_staff",
  "https://hau.ac.in/college-faculty/26/teaching_staff",
  "https://hau.ac.in/get-college-faculty/26/teaching_staff",
];
for (const u of endpoints) {
  const r = await fetch(u);
  console.log(r.status, u, (await r.text()).slice(0, 200));
}
