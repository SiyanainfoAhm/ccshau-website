import { Suspense } from "react";

import { PublicMediaListing } from "@/components/site/public-media-listing";
import { parsePageParam } from "@/lib/data/pagination";
import { getPublishedMediaAlbumsPage } from "@/lib/data/public";

export const metadata = {
  title: "Media Centre",
  description: "Photo galleries, videos, press releases and events from CCSHAU Hisar",
};

export default async function MediaPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string; page?: string }>;
}) {
  const { type = "all", page: pageParam } = await searchParams;
  const data = await getPublishedMediaAlbumsPage({
    page: parsePageParam(pageParam),
    albumType: type,
  });

  return (
    <Suspense fallback={null}>
      <PublicMediaListing data={data} activeType={type} />
    </Suspense>
  );
}
