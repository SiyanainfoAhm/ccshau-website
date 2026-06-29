import { Suspense } from "react";

import { PublicTendersListing } from "@/components/site/public-tenders-listing";
import { parsePageParam } from "@/lib/data/pagination";
import { getPublicTendersPage } from "@/lib/data/public";

export const metadata = {
  title: "Tenders",
  description: "Open and archived tenders from CCSHAU Hisar",
};

export default async function TendersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; page?: string }>;
}) {
  const { status = "all", page: pageParam } = await searchParams;
  const data = await getPublicTendersPage({
    page: parsePageParam(pageParam),
    status: status as "open" | "closed" | "archived" | "all",
  });

  return (
    <Suspense fallback={null}>
      <PublicTendersListing data={data} activeStatus={status} />
    </Suspense>
  );
}
