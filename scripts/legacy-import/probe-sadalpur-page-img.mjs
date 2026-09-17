const urls = [
  "https://hau.ac.in/storage/app/uploads/college-user/3exAK9qWP0yO8IIZwGNlxvEPpsFMbzI4An1XMva2.png",
  "https://hau.ac.in/uploads/college-user/3exAK9qWP0yO8IIZwGNlxvEPpsFMbzI4An1XMva2.png",
  "https://hau.ac.in/storage/app/uploads/college-user/e1H3Okph1UzuWGjozb1b6fGAWWgvYaBbsZQj6rMW.jpeg",
];

for (const u of urls) {
  const r = await fetch(u, { method: "HEAD" });
  console.log(r.status, u);
}

const page = await fetch(
  "https://hau.ac.in/college/krishi-vigyan-kendra-sadalpur-hisar",
);
const html = await page.text();
const collegeUser = [...html.matchAll(/college-user\/[^"'\s<>]+/g)].map((m) => m[0]);
console.log("college-user paths on page:", [...new Set(collegeUser)]);

const nIdx = html.indexOf("Narender");
if (nIdx !== -1) {
  console.log("Narender snippet:", html.slice(Math.max(0, nIdx - 400), nIdx + 400));
}
