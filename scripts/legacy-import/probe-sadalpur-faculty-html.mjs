const slug = "krishi-vigyan-kendra-sadalpur-hisar";
const urls = [
  `https://hau.ac.in/college/${slug}`,
  `https://hau.ac.in/college/${slug}/faculty`,
  `https://hau.ac.in/college/${slug}?tab=faculty`,
];

for (const u of urls) {
  const res = await fetch(u);
  const html = await res.text();
  const imgs = [...html.matchAll(/<img[^>]+src=["']([^"']+)["']/gi)].map((m) => m[1]);
  const collegeUser = imgs.filter((s) => s.includes("college-user") || s.includes("storage/app"));
  console.log("\n", u, "status", res.status, "imgs", collegeUser.length);
  console.log(collegeUser.slice(0, 10));
  const nIdx = html.indexOf("Narender");
  if (nIdx !== -1) {
    console.log("snippet:", html.slice(nIdx - 200, nIdx + 500).replace(/\s+/g, " "));
  }
}

// Try legacy user detail routes
for (const id of [619, 1049]) {
  for (const u of [
    `https://hau.ac.in/college/${slug}/faculty/legacy-user-${id}`,
    `https://hau.ac.in/user/${id}`,
    `https://hau.ac.in/college-user/${id}`,
  ]) {
    const res = await fetch(u);
    if (res.status === 200) {
      const html = await res.text();
      const imgs = [...html.matchAll(/college-user\/[^"'\s<>]+/g)].map((m) => m[0]);
      if (imgs.length) console.log(id, u, imgs.slice(0, 5));
    }
  }
}
