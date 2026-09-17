const html = await (await fetch("https://hau.ac.in/college/krishi-vigyan-kendra-nuh")).text();
console.log("status length", html.length);
const labels = [...html.matchAll(/onclick="getPageDetail\('[^']+','([^']+)'\)"[^>]*>([^<]+)/gi)].map(
  (m) => `${m[2].trim()} (${m[1]})`,
);
const faculty = html.match(/getFaculty\((\d+)/);
console.log("faculty college id", faculty?.[1]);
console.log("quick links", labels);
const coord = html.match(/Coordinator[\s\S]{0,400}/i);
console.log("coord snippet", coord?.[0]?.replace(/\s+/g, " ").slice(0, 400));
