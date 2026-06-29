import { Suspense } from "react";

import { PublicCircularsListing } from "@/components/site/public-circulars-listing";
import { parsePageParam } from "@/lib/data/pagination";
import { getPublishedCircularsPage } from "@/lib/data/public";

export const metadata = {
  title: "Circulars",
  description: "Official circulars and orders from CCSHAU Hisar",
};

export default async function CircularsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const { q, page: pageParam } = await searchParams;
  const data = await getPublishedCircularsPage({
    query: q,
    page: parsePageParam(pageParam),
  });

  return (
    <Suspense fallback={null}>
      <PublicCircularsListing data={data} initialQuery={q ?? ""} />
    </Suspense>
  );
}
