import { Suspense } from "react";

import { PublicCircularsListing } from "@/components/site/public-circulars-listing";
import { parsePageParam } from "@/lib/data/pagination";
import {
  getPublicCircularCategoryTree,
  getPublishedCircularsPage,
} from "@/lib/data/public";

export const metadata = {
  title: "Circulars",
  description: "Official circulars and orders from CCSHAU Hisar",
};

export default async function CircularsPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    page?: string;
    office?: string;
    branch?: string;
  }>;
}) {
  const { q, page: pageParam, office, branch } = await searchParams;
  const offices = await getPublicCircularCategoryTree();
  const activeOffice =
    offices.find((o) => o.slug === office) ?? offices[0] ?? null;
  const branches = activeOffice?.children ?? [];
  const activeBranch =
    branches.find((b) => b.slug === branch) ?? branches[0] ?? null;

  // Match legacy: when an office has branches, list the selected branch;
  // when it has none (e.g. Directorate of Research), list that office's circulars.
  const categoryId = activeBranch?.id ?? activeOffice?.id ?? undefined;
  const includeDescendants = Boolean(activeOffice && !activeBranch);

  const data = await getPublishedCircularsPage({
    query: q,
    page: parsePageParam(pageParam),
    categoryId,
    includeDescendants,
  });

  return (
    <Suspense fallback={null}>
      <PublicCircularsListing
        data={data}
        offices={offices}
        initialQuery={q ?? ""}
        activeOfficeSlug={activeOffice?.slug ?? null}
        activeBranchSlug={activeBranch?.slug ?? null}
      />
    </Suspense>
  );
}
