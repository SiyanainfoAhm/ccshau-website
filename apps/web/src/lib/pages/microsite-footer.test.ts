import { describe, expect, it } from "vitest";

import {
  footerFromContacts,
  parseMicrositeFooter,
  publicFooterFromSaved,
} from "@/lib/pages/microsite-footer";

const lines = [
  { labelEn: "Address", labelHi: "पता", valueEn: "Hisar", valueHi: "हिसार" },
  { labelEn: "Phone", labelHi: null, valueEn: "01662-289000", valueHi: null },
  { labelEn: "Email", labelHi: null, valueEn: "dean@hau.ac.in", valueHi: null },
];

describe("microsite footer", () => {
  it("reads mailing address, office and email id contact labels", () => {
    expect(
      footerFromContacts("College of Agriculture", null, [
        {
          labelEn: "Mailing Address",
          labelHi: null,
          valueEn: "CCS HAU, Hisar",
          valueHi: null,
        },
        { labelEn: "Office", labelHi: null, valueEn: "Office : 01662-255401", valueHi: null },
        { labelEn: "Email Id", labelHi: null, valueEn: "dean@hau.ac.in", valueHi: null },
      ]),
    ).toMatchObject({
      addressEn: "CCS HAU, Hisar",
      phone: "01662-255401",
      email: "dean@hau.ac.in",
    });
  });

  it("fills the default block from contact lines", () => {
    expect(footerFromContacts("College of Agriculture", "कृषि महाविद्यालय", lines)).toMatchObject({
      nameEn: "College of Agriculture",
      nameHi: "कृषि महाविद्यालय",
      addressEn: "Hisar",
      phone: "01662-289000",
      email: "dean@hau.ac.in",
    });
    expect(footerFromContacts("College of Agriculture", "कृषि महाविद्यालय", lines).sections).toHaveLength(4);
  });

  it("uses the saved footer only when custom is on", () => {
    const fallback = footerFromContacts("College", null, lines);
    const saved = parseMicrositeFooter({
      custom: true,
      nameEn: "COA Hisar",
      phone: "100",
      links: [{ labelEn: "Departments", href: "/college/coa/departments" }],
    });
    expect(publicFooterFromSaved(saved, fallback).nameEn).toBe("COA Hisar");
    expect(publicFooterFromSaved(saved, fallback).phone).toBe("100");
    expect(publicFooterFromSaved(saved, fallback).sections[1]?.links[0]?.labelEn).toBe("Departments");
    expect(publicFooterFromSaved({ ...saved, custom: false }, fallback).phone).toBe("01662-289000");
  });

  it("splits an older single link list across the middle two columns", () => {
    const parsed = parseMicrositeFooter({
      custom: true,
      links: [
        { labelEn: "One", href: "/1" },
        { labelEn: "Two", href: "/2" },
        { labelEn: "Three", href: "/3" },
        { labelEn: "Four", href: "/4" },
      ],
    });
    expect(parsed.sections[1]?.links.map((link) => link.labelEn)).toEqual(["One", "Two"]);
    expect(parsed.sections[2]?.links.map((link) => link.labelEn)).toEqual(["Three", "Four"]);
    expect(parsed.sections[0]?.titleEn).toBe("Visit Us");
    expect(parsed.sections[3]?.titleEn).toBe("HAU Links");
  });
});
