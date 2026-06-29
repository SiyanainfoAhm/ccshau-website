import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Calendar, Play } from "lucide-react";

import { SiteFooter } from "@/components/design/shared/site-footer";
import { SiteHeader } from "@/components/design/shared/site-header";
import { getMediaAlbumBySlug } from "@/lib/data/public";
import { SELECTED_LAYOUT } from "@/lib/design/selected-layout";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const album = await getMediaAlbumBySlug(slug);
  if (!album) return { title: "Album not found" };
  return {
    title: album.titleEn,
    description: `${album.titleEn} — CCSHAU Media Centre`,
  };
}

export default async function MediaAlbumPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const album = await getMediaAlbumBySlug(slug);
  if (!album) notFound();

  return (
    <>
      <SiteHeader variant="future" />
      <main id="main-content" className="flex-1 bg-slate-50">
        <div className="gradient-hero px-4 py-12 text-white">
          <div className="mx-auto max-w-7xl">
            <Link
              href={SELECTED_LAYOUT.routes.media}
              className="mb-4 inline-flex items-center gap-2 text-sm text-emerald-200 hover:text-white"
            >
              <ArrowLeft className="h-4 w-4" /> All albums
            </Link>
            <p className="text-sm font-bold uppercase tracking-widest text-amber-300">
              {album.albumType.replace(/_/g, " ")}
            </p>
            <h1 className="font-display text-3xl font-bold md:text-4xl">{album.titleEn}</h1>
            {album.titleHi && <p className="mt-2 text-emerald-100">{album.titleHi}</p>}
            {album.eventDate && (
              <p className="mt-3 inline-flex items-center gap-2 text-sm text-emerald-200">
                <Calendar className="h-4 w-4" />
                {new Date(album.eventDate).toLocaleDateString("en-IN", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </p>
            )}
          </div>
        </div>

        <div className="mx-auto max-w-7xl px-4 py-10">
          {album.items.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-slate-200 bg-white p-12 text-center text-slate-500">
              No media items in this album yet.
            </p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {album.items.map((item) => (
                <figure
                  key={item.id}
                  className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
                >
                  <div className="relative aspect-[4/3] bg-slate-100">
                    {item.mediaType === "video" ? (
                      item.url ? (
                        <video
                          src={item.url}
                          controls
                          className="h-full w-full object-cover"
                          poster={item.thumbnailUrl ?? undefined}
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center">
                          <Play className="h-12 w-12 text-slate-400" />
                        </div>
                      )
                    ) : item.url ? (
                      <Image
                        src={item.url}
                        alt={item.titleEn ?? ""}
                        fill
                        className="object-cover"
                        sizes="(max-width: 768px) 100vw, 33vw"
                      />
                    ) : null}
                  </div>
                  {(item.titleEn || item.captionEn) && (
                    <figcaption className="p-4 text-sm">
                      {item.titleEn && <p className="font-semibold text-slate-900">{item.titleEn}</p>}
                      {item.captionEn && <p className="mt-1 text-slate-600">{item.captionEn}</p>}
                    </figcaption>
                  )}
                </figure>
              ))}
            </div>
          )}
        </div>
      </main>
      <SiteFooter variant="future" />
    </>
  );
}
