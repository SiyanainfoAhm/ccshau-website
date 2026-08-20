import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Calendar } from "lucide-react";

import { SiteFooter } from "@/components/design/shared/site-footer";
import { SiteHeader } from "@/components/design/shared/site-header";
import { PublicMediaAlbumGrid } from "@/components/site/public-media-album-grid";
import { publicEmptyStateClass, publicMainClass } from "@/lib/design/public-page-classes";
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
      <main id="main-content" tabIndex={-1} className={publicMainClass}>
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
            <p className={publicEmptyStateClass}>No media items in this album yet.</p>
          ) : (
            <PublicMediaAlbumGrid items={album.items} albumTitleEn={album.titleEn} />
          )}
        </div>
      </main>
      <SiteFooter variant="future" />
    </>
  );
}
