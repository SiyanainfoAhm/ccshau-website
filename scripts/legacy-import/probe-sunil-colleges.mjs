const ids = { fatehabad: 29, sirsa: 37 };
for (const [name, id] of Object.entries(ids)) {
  const rows = await (await fetch(`https://hau.ac.in/college/faculty/${id}/teaching_staff`)).json();
  console.log(
    name,
    rows.map((u) => `${u.id} ${(u.first_name || "").trim()} ${(u.last_name || "").trim()}`.trim()),
  );
}
