import { Suspense } from "react";

import { PublicDownloadsListing } from "@/components/site/public-downloads-listing";
import { parsePageParam } from "@/lib/data/pagination";
import {
  getPublicDownloadFilterDepartments,
  getPublicDownloadTags,
  getPublishedDownloadsPage,
} from "@/lib/data/public";

export const metadata = {
  title: "Downloads",
  description: "Forms, prospectus, syllabus and official documents from CCSHAU Hisar",
};

export default async function DownloadsPage({
  searchParams,
}: {
  searchParams: Promise<{
    category?: string;
    department?: string;
    tag?: string;
    q?: string;
    page?: string;
  }>;
}) {
  const { category, department, tag, q, page: pageParam } = await searchParams;

  const [data, departments, tags] = await Promise.all([
    getPublishedDownloadsPage({
      category: category && category !== "all" ? category : undefined,
      departmentId: department || undefined,
      tag: tag || undefined,
      query: q,
      page: parsePageParam(pageParam),
    }),
    getPublicDownloadFilterDepartments(),
    getPublicDownloadTags(),
  ]);

  return (
    <Suspense fallback={null}>
      <PublicDownloadsListing
        data={data}
        activeCategory={category ?? "all"}
        activeDepartmentId={department ?? ""}
        activeTag={tag ?? ""}
        initialQuery={q ?? ""}
        departments={departments}
        tags={tags}
      />
    </Suspense>
  );
}
