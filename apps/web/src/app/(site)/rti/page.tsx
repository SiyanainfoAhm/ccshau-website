import { Suspense } from "react";

import { PublicRtiListing } from "@/components/site/public-rti-listing";
import { parsePageParam } from "@/lib/data/pagination";
import { getPublishedRtiDocumentsPage } from "@/lib/data/public";

export const metadata = {
  title: "Right To Information",
  description: "RTI Act documents, rules, and disclosures from CCSHAU Hisar",
};

export default async function RtiPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const { page: pageParam } = await searchParams;
  const data = await getPublishedRtiDocumentsPage({
    page: parsePageParam(pageParam),
  });

  return (
    <Suspense fallback={null}>
      <PublicRtiListing data={data} />
    </Suspense>
  );
}
