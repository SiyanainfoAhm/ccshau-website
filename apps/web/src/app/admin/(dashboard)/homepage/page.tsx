import Link from "next/link";
import { ArrowRight, GraduationCap, Megaphone, Quote, Sprout, Users } from "lucide-react";

import { requireAdminSession } from "@/lib/auth/session";

const sections = [
  {
    href: "/admin/banners",
    title: "Hero carousel",
    description: "Homepage banner slides and campaign images",
    icon: Megaphone,
  },
  {
    href: "/admin/homepage/quotes",
    title: "Inspirational quotes",
    description: "Rotating quotes below the hero section",
    icon: Quote,
  },
  {
    href: "/admin/pages",
    title: "About section",
    description: "Edit the published page with slug about",
    icon: ArrowRight,
  },
  {
    href: "/admin/homepage/dignitaries",
    title: "Dignitaries",
    description: "Photos and titles for the dignitaries carousel",
    icon: Users,
  },
  {
    href: "/admin/pages",
    title: "Colleges grid",
    description: "Child pages under colleges — logos in page settings",
    icon: GraduationCap,
  },
  {
    href: "/admin/homepage/flagships",
    title: "Flagships",
    description: "University initiatives carousel",
    icon: Megaphone,
  },
  {
    href: "/admin/related-links",
    title: "Partners",
    description: "Our Partners strip on the homepage",
    icon: ArrowRight,
  },
  {
    href: "/admin/homepage/cta",
    title: "Farmers' portal CTA",
    description: "Call-to-action band above the footer",
    icon: Sprout,
  },
  {
    href: "/admin/news",
    title: "News & notifications",
    description: "Latest news and notification columns",
    icon: ArrowRight,
  },
  {
    href: "/admin/menus",
    title: "Quick links & menus",
    description: "Header, footer, and quick link menus",
    icon: ArrowRight,
  },
];

export default async function AdminHomepageHubPage() {
  await requireAdminSession();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-slate-900">Homepage</h1>
        <p className="mt-1 text-sm text-slate-500">
          Manage content shown on the public homepage at{" "}
          <Link href="/" className="text-emerald-700 hover:underline" target="_blank">
            /
          </Link>
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {sections.map((section) => (
          <Link
            key={section.title}
            href={section.href}
            className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-emerald-200 hover:shadow-md"
          >
            <section.icon className="h-6 w-6 text-emerald-700" aria-hidden />
            <h2 className="mt-3 font-display text-lg font-bold text-slate-900">{section.title}</h2>
            <p className="mt-1 text-sm text-slate-600">{section.description}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
