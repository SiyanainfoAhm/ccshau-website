export interface FacultyProfileSection {
  title: string;
  lines: string[];
}

const SECTION_PATTERNS: { pattern: RegExp; title: string }[] = [
  { pattern: /^personal$/i, title: "Personal" },
  { pattern: /^academic qualification$/i, title: "Academic Qualification" },
  { pattern: /^professional qualification$/i, title: "Professional Qualification" },
  { pattern: /^membership of professional societies$/i, title: "Membership of Professional Societies" },
  { pattern: /^career profile$/i, title: "Career Profile" },
  { pattern: /^research interest\/?\s*specialization$/i, title: "Research Interest / Specialization" },
  { pattern: /^teaching interest/i, title: "Teaching Interest" },
  { pattern: /^publications$/i, title: "Publications" },
  { pattern: /^educational qualifications$/i, title: "Educational Qualifications" },
  { pattern: /^administrative assignments$/i, title: "Administrative Assignments" },
  { pattern: /^books\/?monographs/i, title: "Books / Monographs" },
  { pattern: /^research publications/i, title: "Research Publications" },
  { pattern: /^awards and honors$/i, title: "Awards and Honors" },
  { pattern: /^project details$/i, title: "Project Details" },
  { pattern: /^invited lectures/i, title: "Invited Lectures" },
  { pattern: /^training\/?short term/i, title: "Training / Short Term Courses" },
  { pattern: /^other academic activities$/i, title: "Other Academic Activities" },
];

function matchSectionHeader(line: string): string | null {
  const trimmed = line.trim();
  if (!trimmed || trimmed.length > 120) return null;

  for (const { pattern, title } of SECTION_PATTERNS) {
    if (pattern.test(trimmed)) return title;
  }
  return null;
}

export function isLegacyPlainFacultyProfile(content: string): boolean {
  const trimmed = content.trim();
  if (!trimmed || /<[a-z][\s\S]*>/i.test(trimmed)) return false;
  const lower = trimmed.toLowerCase();
  return (
    lower.includes("academic qualification") ||
    lower.includes("career profile") ||
    lower.includes("other activities") ||
    lower.includes("educational qualifications")
  );
}

export function parseLegacyFacultyProfile(content: string): FacultyProfileSection[] {
  const lines = content.replace(/\r/g, "").split("\n");
  const sections: FacultyProfileSection[] = [];
  let current: FacultyProfileSection | null = null;

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    if (/^other activities$/i.test(line)) continue;

    const header = matchSectionHeader(line);
    if (header) {
      if (current && current.lines.length > 0) sections.push(current);
      current = { title: header, lines: [] };
      continue;
    }

    if (!current) current = { title: "Profile", lines: [] };
    current.lines.push(rawLine);
  }

  if (current && current.lines.length > 0) sections.push(current);
  return sections;
}

export function parseKeyValueLines(lines: string[]): { key: string; value: string }[] {
  const pairs: { key: string; value: string }[] = [];

  for (const raw of lines) {
    const chunks = raw.split(/\t+/).map((c) => c.trim()).filter(Boolean);
    for (const chunk of chunks.length ? chunks : [raw.trim()]) {
      const matches = [...chunk.matchAll(/([A-Za-z][A-Za-z\s()/.-]+?):\s*([^:]+?)(?=(?:\s+[A-Z][A-Za-z\s()/.-]+:)|$)/g)];
      if (matches.length === 0) {
        const simple = chunk.match(/^(.+?):\s*(.*)$/);
        if (simple) {
          pairs.push({
            key: simple[1].replace(/\s+/g, " ").trim(),
            value: simple[2].trim(),
          });
        } else if (chunk) {
          pairs.push({ key: "", value: chunk });
        }
        continue;
      }
      for (const match of matches) {
        pairs.push({
          key: match[1].replace(/\s+/g, " ").trim(),
          value: match[2].trim(),
        });
      }
    }
  }

  return pairs.filter((p) => p.key || p.value);
}

export function splitTabularRows(lines: string[]): string[][] {
  return lines
    .map((line) => line.split(/\t+/).map((cell) => cell.trim()).filter(Boolean))
    .filter((row) => row.some(Boolean));
}

export function isTableSection(lines: string[]): boolean {
  const rows = splitTabularRows(lines);
  if (rows.length < 2) return false;
  const tabbed = lines.filter((l) => l.includes("\t")).length;
  return tabbed >= Math.min(2, lines.length);
}
