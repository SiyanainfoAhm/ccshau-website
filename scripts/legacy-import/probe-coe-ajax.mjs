const endpoints = [
  "https://hau.ac.in/page/controller-of-examination",
  "https://hau.ac.in/getPageDetail/55/page/controller-of-examination",
  "https://hau.ac.in/college/page/controller-of-examination",
  "https://hau.ac.in/ajax/getPageDetail?college_id=55&slug=page/controller-of-examination",
];

for (const u of endpoints) {
  try {
    const r = await fetch(u, {
      headers: {
        "User-Agent": "Mozilla/5.0",
        "X-Requested-With": "XMLHttpRequest",
        Referer: "https://hau.ac.in/college/registrar-office",
      },
    });
    const t = await r.text();
    console.log("\n===", r.status, u, "len", t.length);
    const img = t.match(/src="([^"]+\.(?:jpe?g|png|webp)[^"]*)"/i);
    console.log("first img", img?.[1] || "(none)");
    if (t.toLowerCase().includes("surender")) {
      console.log(t.slice(0, 1200));
    }
  } catch (e) {
    console.log("fail", u, e.message);
  }
}

// Search page source JS for getPageDetail
const home = await (await fetch("https://hau.ac.in/college/registrar-office")).text();
const fn = home.match(/function getPageDetail[\s\S]{0,800}/);
console.log("\nfn snippet", fn?.[0]?.slice(0, 700));
const ajax = [...home.matchAll(/getPageDetail[^\n]{0,200}/g)].slice(0, 5);
console.log(ajax.map((m) => m[0]));
