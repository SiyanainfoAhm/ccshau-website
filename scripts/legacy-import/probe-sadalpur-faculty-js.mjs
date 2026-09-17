const html = await (
  await fetch("https://hau.ac.in/college/krishi-vigyan-kendra-sadalpur-hisar")
).text();

// Search for Narender, faculty table, user ids, ajax endpoints
for (const term of [
  "Narender",
  "619",
  "1049",
  "college-user",
  "getFaculty",
  "faculty-list",
  "users-list",
  "/api/",
]) {
  const count = (html.match(new RegExp(term, "gi")) || []).length;
  if (count) console.log(term, count);
}

// Extract script srcs
const scripts = [...html.matchAll(/<script[^>]+src=["']([^"']+)["']/gi)].map((m) => m[1]);
console.log("scripts", scripts.slice(0, 15));

// Inline scripts mentioning faculty/user
const inline = [...html.matchAll(/<script[^>]*>([\s\S]{0,8000}?)<\/script>/gi)]
  .map((m) => m[1])
  .filter((s) => /faculty|college-user|users/i.test(s));
console.log("inline faculty scripts", inline.length);
for (const s of inline.slice(0, 2)) {
  console.log(s.slice(0, 1500));
}

// Look for data in JSON
const jsonLike = [...html.matchAll(/\{[^{}]{0,200}profile_image[^{}]{0,200}\}/g)];
console.log("json with profile_image", jsonLike.length);
for (const m of jsonLike.slice(0, 5)) console.log(m[0]);
