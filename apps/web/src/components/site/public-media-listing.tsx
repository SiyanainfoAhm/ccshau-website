"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, ArrowUpRight, Calendar, ImageIcon, Play } from "lucide-react";

import { SiteFooter } from "@/components/design/shared/site-footer";
import { SiteHeader } from "@/components/design/shared/site-header";
import { useLanguage } from "@/components/design/shared/language-context";
import type { PaginatedResult } from "@/lib/data/pagination";
import type { PublicMediaAlbumItem } from "@/lib/data/public-types";
import { SELECTED_LAYOUT } from "@/lib/design/selected-layout";
import { PublicPagination } from "@/components/site/public-pagination";

const ALBUM_TYPES = [
  { value: "all", labelEn: "All", labelHi: "सभी" },
  { value: "photo", labelEn: "Photos", labelHi: "फोटो" },
  { value: "video", labelEn: "Videos", labelHi: "वीडियो" },
  { value: "press_release", labelEn: "Press releases", labelHi: "प्रेस विज्ञप्ति" },
  { value: "event", labelEn: "Events", labelHi: "कार्यक्रम" },
];

export function PublicMediaListing({
  data,
  activeType,
}: {
  data: PaginatedResult<PublicMediaAlbumItem>;
  activeType: string;
}) {
  const { t } = useLanguage();
  const router = useRouter();
  const searchParams = useSearchParams();

  function setType(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value === "all") params.delete("type");
    else params.set("type", value);
    params.delete("page");
    router.push(`/media?${params.toString()}`);
  }

  return (
    <>
      <SiteHeader variant="future" />
      <main id="main-content" className="flex-1 bg-slate-900 text-white">
        <div className="gradient-hero px-4 py-14">
          <div className="mx-auto max-w-7xl">
            <Link
              href={SELECTED_LAYOUT.homePath}
              className="mb-4 inline-flex items-center gap-2 text-sm text-emerald-200 hover:text-white"
            >
              <ArrowLeft className="h-4 w-4" /> Back to home
            </Link>
            <h1 className="font-display text-4xl font-bold">
              {t("Media Centre", "मीडिया केंद्र")}
            </h1>
            <p className="mt-2 text-emerald-100">
              {t("Photo galleries, videos, press releases and events", "फोटो गैलरी, वीडियो और कार्यक्रम")}
            </p>
          </div>
        </div>

        <div className="mx-auto max-w-7xl px-4 py-10">
          <div className="mb-8 flex flex-wrap gap-2">
            {ALBUM_TYPES.map((tab) => (
              <button
                key={tab.value}
                type="button"
                onClick={() => setType(tab.value)}
                className={`rounded-full px-4 py-1.5 text-sm font-medium ${
                  activeType === tab.value
                    ? "bg-amber-400 text-emerald-950"
                    : "bg-white/10 text-white hover:bg-white/20"
                }`}
              >
                {t(tab.labelEn, tab.labelHi)}
              </button>
            ))}
          </div>

          {data.items.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-white/20 p-12 text-center text-emerald-200/80">
              {t("No media albums published yet.", "अभी कोई मीडिया एल्बम प्रकाशित नहीं है।")}
            </p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {data.items.map((album) => (
                <Link
                  key={album.id}
                  href={`/media/${album.slug}`}
                  className="group relative overflow-hidden rounded-2xl bg-slate-800 ring-1 ring-white/10 transition hover:ring-amber-400/50"
                >
                  <div className="relative aspect-[4/3]">
                    {album.coverUrl ? (
                      <Image
                        src={album.coverUrl}
                        alt=""
                        fill
                        className="object-cover transition duration-500 group-hover:scale-105"
                        sizes="(max-width: 768px) 100vw, 33vw"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center bg-slate-700">
                        <ImageIcon className="h-12 w-12 text-slate-500" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                    {album.albumType === "video" && (
                      <div className="absolute left-1/2 top-1/2 flex h-12 w-12 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-amber-400 text-emerald-950 shadow-xl">
                        <Play className="h-5 w-5 fill-current" />
                      </div>
                    )}
                  </div>
                  <div className="p-4">
                    <p className="text-xs font-bold uppercase tracking-wider text-amber-400">
                      {album.albumType.replace(/_/g, " ")}
                    </p>
                    <h2 className="mt-1 font-display text-lg font-bold group-hover:text-amber-200">
                      {t(album.titleEn, album.titleHi ?? album.titleEn)}
                    </h2>
                    <div className="mt-2 flex items-center gap-3 text-xs text-emerald-200/80">
                      {album.eventDate && (
                        <span className="inline-flex items-center gap-1">
                          <Calendar className="h-3.5 w-3.5" />
                          {new Date(album.eventDate).toLocaleDateString("en-IN")}
                        </span>
                      )}
                      <span>
                        {album.itemCount} {t("items", "आइटम")}
                      </span>
                    </div>
                  </div>
                  <ArrowUpRight className="absolute right-4 top-4 h-5 w-5 text-white/60 opacity-0 transition group-hover:opacity-100" />
                </Link>
              ))}
            </div>
          )}
          <PublicPagination data={data} />
        </div>
      </main>
      <SiteFooter variant="future" />
    </>
  );
}
