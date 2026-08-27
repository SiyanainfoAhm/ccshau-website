import { describe, expect, it } from "vitest";

import {
  isLegacyPlainFacultyProfile,
  isTableSection,
  parseKeyValueLines,
  parseLegacyFacultyProfile,
  splitTabularRows,
} from "@/lib/faculty/parse-legacy-profile";

describe("parse-legacy-profile", () => {
  it("detects plain legacy profile text", () => {
    expect(
      isLegacyPlainFacultyProfile(
        "Academic Qualification\nPh.D. Agronomy\nCareer Profile\nProfessor",
      ),
    ).toBe(true);
    expect(isLegacyPlainFacultyProfile("<p>HTML profile</p>")).toBe(false);
    expect(isLegacyPlainFacultyProfile("short bio")).toBe(false);
  });

  it("splits content into titled sections", () => {
    const sections = parseLegacyFacultyProfile(
      [
        "Dr. Sample",
        "Academic Qualification",
        "Ph.D. (Agronomy)",
        "Career Profile",
        "Professor",
        "Other Activities",
        "Publications",
        "Paper 1",
      ].join("\n"),
    );

    expect(sections.map((s) => s.title)).toEqual([
      "Profile",
      "Academic Qualification",
      "Career Profile",
      "Publications",
    ]);
    expect(sections[1].lines).toContain("Ph.D. (Agronomy)");
  });

  it("parses key/value lines and tabular rows", () => {
    expect(parseKeyValueLines(["Name: Ada\tRole: Dean"])).toEqual(
      expect.arrayContaining([
        { key: "Name", value: "Ada" },
        { key: "Role", value: "Dean" },
      ]),
    );

    expect(splitTabularRows(["A\tB", "1\t2"])).toEqual([
      ["A", "B"],
      ["1", "2"],
    ]);
    expect(isTableSection(["A\tB", "1\t2"])).toBe(true);
    expect(isTableSection(["only one line"])).toBe(false);
  });
});
