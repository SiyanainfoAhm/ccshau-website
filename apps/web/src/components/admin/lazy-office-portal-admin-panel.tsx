"use client";

import { useEffect, useState, useTransition } from "react";

import { loadOfficePortalDataForAdminAction } from "@/actions/office-portal";
import { OfficePortalAdminPanel } from "@/components/admin/office-portal-admin-panel";
import type {
  PageContactLine,
  PageGalleryItem,
  PageNewsTickerItem,
  PageSidebarItem,
  PageStaff,
  PageStudentCornerItem,
} from "@/lib/database/types";

type OfficePortalData = {
  contactLines: PageContactLine[];
  staff: PageStaff[];
  galleryItems: PageGalleryItem[];
  newsTickerItems: PageNewsTickerItem[];
  studentCornerItems: PageStudentCornerItem[];
  sidebarItems: PageSidebarItem[];
};

export function LazyOfficePortalAdminPanel({
  pageId,
  showContacts = true,
  showStaff = true,
  showGallery = true,
  showNewsTicker = true,
  showStudentCorner = true,
  showLeftSidebar = true,
  showRightSidebar = true,
  canEdit = true,
  onContactLinesLoaded,
}: {
  pageId: string;
  showContacts?: boolean;
  showStaff?: boolean;
  showGallery?: boolean;
  showNewsTicker?: boolean;
  showStudentCorner?: boolean;
  showLeftSidebar?: boolean;
  showRightSidebar?: boolean;
  canEdit?: boolean;
  onContactLinesLoaded?: (lines: PageContactLine[]) => void;
}) {
  const [data, setData] = useState<OfficePortalData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    let cancelled = false;
    startTransition(async () => {
      try {
        const next = await loadOfficePortalDataForAdminAction(pageId);
        if (cancelled) return;
        setData(next);
        onContactLinesLoaded?.(next.contactLines);
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : "Failed to load office portal data.");
      }
    });
    return () => {
      cancelled = true;
    };
    // Intentionally only re-fetch when page changes; callback is for one-shot seed.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageId]);

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
        {error}
      </div>
    );
  }

  if (!data || isPending) {
    return (
      <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-6 py-8 text-center text-sm text-slate-600">
        Loading office portal sections…
      </div>
    );
  }

  return (
    <OfficePortalAdminPanel
      pageId={pageId}
      contactLines={data.contactLines}
      staff={data.staff}
      galleryItems={data.galleryItems}
      newsTickerItems={data.newsTickerItems}
      studentCornerItems={data.studentCornerItems}
      sidebarItems={data.sidebarItems}
      showContacts={showContacts}
      showStaff={showStaff}
      showGallery={showGallery}
      showNewsTicker={showNewsTicker}
      showStudentCorner={showStudentCorner}
      showLeftSidebar={showLeftSidebar}
      showRightSidebar={showRightSidebar}
      canEdit={canEdit}
    />
  );
}
