"use client";

import Image from "next/image";
import Link from "next/link";

import { useLanguage } from "@/components/design/shared/language-context";
import type { PublicResearchStationCard } from "@/lib/data/public-types";
import { pickBilingual } from "@/lib/i18n/pick-bilingual";
import { toUpperMenuLabel } from "@/lib/i18n/menu-label";

function isRemoteSrc(src: string) {
  return /^https?:\/\//i.test(src);
}

export function RegionalResearchStationsGrid({
  stations,
}: {
  stations: PublicResearchStationCard[];
}) {
  const { lang } = useLanguage();

  if (stations.length === 0) return null;

  return (
    <section className="overflow-hidden rounded-2xl bg-[#dceee0] p-3 shadow-sm sm:p-5">
      <div className="rounded-xl bg-white p-3 shadow-sm sm:p-5">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {stations.map((station) => {
            const label = pickBilingual(lang, station.titleEn, station.titleHi);
            const display = lang === "hi" ? label : toUpperMenuLabel(label);
            const image = station.imageUrl;

            return (
              <Link
                key={station.slug}
                href={station.href}
                className="group relative block aspect-[16/10] overflow-hidden rounded-md bg-white shadow-md ring-1 ring-slate-200/80 transition hover:-translate-y-0.5 hover:shadow-lg"
              >
                {image ? (
                  <Image
                    src={image}
                    alt={display}
                    fill
                    className="object-cover transition duration-500 group-hover:scale-105"
                    sizes="(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 25vw"
                    unoptimized={!isRemoteSrc(image)}
                  />
                ) : (
                  <div className="absolute inset-0 bg-slate-50" />
                )}
                <div className="absolute inset-0 bg-white/25 group-hover:bg-white/15" />
                <span
                  className={`absolute inset-0 flex items-center justify-center px-3 text-center text-sm font-bold leading-snug tracking-wide text-slate-900 drop-shadow-[0_1px_1px_rgba(255,255,255,0.85)] sm:text-[0.95rem] ${
                    lang === "hi" ? "font-hindi" : ""
                  }`}
                >
                  {display}
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
