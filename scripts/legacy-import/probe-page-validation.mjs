import { pageFormSchema } from "../../apps/web/src/lib/validations/pages.ts";

const candidates = [
  {
    name: "baseline registrar",
    data: {
      titleEn: "Registrar Office",
      slug: "registrar-office",
      pageType: "college",
      layoutTemplate: "office_portal",
      status: "published",
      contactLocationEnabled: "off",
      officeCtaEnabled: true,
      departmentId: "",
      parentId: "",
    },
  },
  {
    name: "contact on empty",
    data: {
      titleEn: "Registrar Office",
      slug: "registrar-office",
      pageType: "college",
      layoutTemplate: "office_portal",
      status: "published",
      contactLocationEnabled: "on",
      officeCtaEnabled: true,
      addressEn: "",
      phone: "",
      email: "",
      departmentId: "",
      parentId: "",
    },
  },
  {
    name: "bad lat",
    data: {
      titleEn: "Registrar Office",
      slug: "registrar-office",
      pageType: "college",
      layoutTemplate: "office_portal",
      status: "published",
      contactLocationEnabled: "off",
      mapLat: "abc",
      departmentId: "",
      parentId: "",
      officeCtaEnabled: true,
    },
  },
  {
    name: "empty status",
    data: {
      titleEn: "Registrar Office",
      slug: "registrar-office",
      pageType: "college",
      layoutTemplate: "office_portal",
      status: "",
      contactLocationEnabled: "off",
      departmentId: "",
      parentId: "",
      officeCtaEnabled: true,
    },
  },
  {
    name: "null status",
    data: {
      titleEn: "Registrar Office",
      slug: "registrar-office",
      pageType: "college",
      layoutTemplate: "office_portal",
      status: null,
      contactLocationEnabled: "off",
      departmentId: "",
      parentId: "",
      officeCtaEnabled: true,
    },
  },
  {
    name: "checkbox on string",
    data: {
      titleEn: "Registrar Office",
      slug: "registrar-office",
      pageType: "college",
      layoutTemplate: "office_portal",
      status: "published",
      contactLocationEnabled: "off",
      departmentId: "",
      parentId: "",
      officeCtaEnabled: "on",
    },
  },
  {
    name: "invalid parent uuid",
    data: {
      titleEn: "Registrar Office",
      slug: "registrar-office",
      pageType: "college",
      layoutTemplate: "office_portal",
      status: "published",
      contactLocationEnabled: "off",
      departmentId: "",
      parentId: "abc",
      officeCtaEnabled: true,
    },
  },
];

for (const c of candidates) {
  const r = pageFormSchema.safeParse(c.data);
  console.log(
    c.name,
    r.success ? "OK" : JSON.stringify(r.error.flatten().fieldErrors),
  );
}
