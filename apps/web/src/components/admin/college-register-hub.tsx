"use client";

import Link from "next/link";
import { GraduationCap, Users } from "lucide-react";

import type { CollegeOption } from "@/lib/pages/college-register-helpers";

export function CollegeRegisterHub({ college }: { college: CollegeOption }) {
  const base = `/admin/register/${college.id}`;
  const cards = [
    {
      href: `${base}/department`,
      icon: GraduationCap,
      title: "Departments",
      desc: "List, add, edit, or delete departments or divisions under this microsite.",
    },
    {
      href: `${base}/faculty`,
      icon: Users,
      title: "Faculty",
      desc: "List, add, edit, or delete HOD and faculty with profile pages.",
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {cards.map((card) => (
        <Link
          key={card.href}
          href={card.href}
          className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm transition hover:border-emerald-300 hover:shadow-md"
        >
          <card.icon className="h-8 w-8 text-emerald-700" aria-hidden />
          <h2 className="mt-3 font-display text-lg font-bold text-slate-900">{card.title}</h2>
          <p className="mt-2 text-sm text-slate-600">{card.desc}</p>
        </Link>
      ))}
    </div>
  );
}
