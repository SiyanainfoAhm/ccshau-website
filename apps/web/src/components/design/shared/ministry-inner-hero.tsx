import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export function MinistryInnerHero({
  title,
  titleHi,
  backHref = "/design/option-c",
}: {
  title: string;
  titleHi: string;
  backHref?: string;
}) {
  return (
    <div className="border-b-4 border-[#146c43] bg-white">
      <div className="goi-tricolor-bar" />
      <div className="mx-auto max-w-7xl px-4 py-10">
        <Link
          href={backHref}
          className="mb-4 inline-flex items-center gap-2 text-sm font-semibold text-[#146c43] hover:underline"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Back to home
        </Link>
        <h1 className="font-display text-3xl font-bold text-slate-900 md:text-4xl">{title}</h1>
        <p className="mt-1 font-hindi text-lg text-slate-600">{titleHi}</p>
      </div>
    </div>
  );
}
