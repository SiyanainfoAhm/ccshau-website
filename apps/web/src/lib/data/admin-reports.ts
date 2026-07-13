import { isUniversityWideCmsSession } from "@/lib/auth/cms-roles";
import type { AdminSession } from "@/lib/auth/session";
import { Tables } from "@/lib/database/names";
import type { ContentStatus, FeedbackStatus, TenderStatus } from "@/lib/database/types";
import { createAdminClient } from "@/lib/supabase/admin";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type CountQuery = any;

async function countRows(
  table: string,
  apply?: (q: CountQuery) => CountQuery,
): Promise<number> {
  const admin = createAdminClient();
  if (!admin) return 0;
  let q = admin.from(table).select("*", { count: "exact", head: true });
  if (apply) q = apply(q);
  const { count } = await q;
  return count ?? 0;
}

export type ReportModuleStats = {
  label: string;
  href: string;
  total: number;
  draft: number;
  pendingReview: number;
  live: number;
};

export type ReportPendingItem = {
  id: string;
  title: string;
  module: string;
  href: string;
  updatedAt: string;
};

export type AdminReportsData = {
  roleLabel: string;
  departmentScoped: boolean;
  modules: ReportModuleStats[];
  feedback: { new: number; inProgress: number; resolved: number; total: number };
  tenders: { open: number; pendingReview: number; closingSoon: number };
  pendingItems: ReportPendingItem[];
  generatedAt: string;
};

function deptFilter(session: AdminSession) {
  if (isUniversityWideCmsSession(session) || !session.departmentId) {
    return undefined;
  }
  return (q: CountQuery) => q.eq("department_id", session.departmentId);
}

export async function getAdminReportsData(session: AdminSession): Promise<AdminReportsData> {
  const dept = deptFilter(session);
  const departmentScoped = Boolean(dept);

  const [
    pagesTotal,
    pagesDraft,
    pagesPending,
    pagesPublished,
    newsTotal,
    newsDraft,
    newsPending,
    newsPublished,
    circularsTotal,
    circularsDraft,
    circularsPending,
    circularsPublished,
    downloadsTotal,
    downloadsDraft,
    downloadsPending,
    downloadsPublished,
    mediaTotal,
    mediaDraft,
    mediaPending,
    mediaPublished,
    tendersTotal,
    tendersDraft,
    tendersPending,
    tendersOpen,
    feedbackNew,
    feedbackInProgress,
    feedbackResolved,
    feedbackTotal,
  ] = await Promise.all([
    countRows(Tables.pages, dept),
    countRows(Tables.pages, (q) => (dept ? dept(q) : q).eq("status", "draft")),
    countRows(Tables.pages, (q) => (dept ? dept(q) : q).eq("status", "pending_review")),
    countRows(Tables.pages, (q) => (dept ? dept(q) : q).eq("status", "published" satisfies ContentStatus)),
    countRows(Tables.news, dept),
    countRows(Tables.news, (q) => (dept ? dept(q) : q).eq("status", "draft")),
    countRows(Tables.news, (q) => (dept ? dept(q) : q).eq("status", "pending_review")),
    countRows(Tables.news, (q) => (dept ? dept(q) : q).eq("status", "published")),
    countRows(Tables.circulars, dept),
    countRows(Tables.circulars, (q) => (dept ? dept(q) : q).eq("status", "draft")),
    countRows(Tables.circulars, (q) => (dept ? dept(q) : q).eq("status", "pending_review")),
    countRows(Tables.circulars, (q) => (dept ? dept(q) : q).eq("status", "published")),
    countRows(Tables.downloads, dept),
    countRows(Tables.downloads, (q) => (dept ? dept(q) : q).eq("status", "draft")),
    countRows(Tables.downloads, (q) => (dept ? dept(q) : q).eq("status", "pending_review")),
    countRows(Tables.downloads, (q) => (dept ? dept(q) : q).eq("status", "published")),
    countRows(Tables.mediaAlbums, dept),
    countRows(Tables.mediaAlbums, (q) => (dept ? dept(q) : q).eq("status", "draft")),
    countRows(Tables.mediaAlbums, (q) => (dept ? dept(q) : q).eq("status", "pending_review")),
    countRows(Tables.mediaAlbums, (q) => (dept ? dept(q) : q).eq("status", "published")),
    countRows(Tables.tenders, dept),
    countRows(Tables.tenders, (q) => (dept ? dept(q) : q).eq("status", "draft")),
    countRows(Tables.tenders, (q) => (dept ? dept(q) : q).eq("status", "pending_review" satisfies TenderStatus)),
    countRows(Tables.tenders, (q) => (dept ? dept(q) : q).eq("status", "open" satisfies TenderStatus)),
    countRows(Tables.feedback, (q) => q.eq("status", "new" satisfies FeedbackStatus)),
    countRows(Tables.feedback, (q) => q.eq("status", "in_progress")),
    countRows(Tables.feedback, (q) => q.eq("status", "resolved")),
    countRows(Tables.feedback),
  ]);

  const admin = createAdminClient();
  let closingSoon = 0;
  const pendingItems: ReportPendingItem[] = [];

  if (admin) {
    const closingDate = new Date();
    closingDate.setDate(closingDate.getDate() + 14);

    let closingQuery = admin
      .from(Tables.tenders)
      .select("*", { count: "exact", head: true })
      .eq("status", "open")
      .not("closing_date", "is", null)
      .lte("closing_date", closingDate.toISOString().slice(0, 10));
    if (dept) closingQuery = dept(closingQuery);
    const { count } = await closingQuery;
    closingSoon = count ?? 0;

    const pendingQueries = await Promise.all(
      [
        { table: Tables.pages, label: "Pages", href: "/admin/pages" },
        { table: Tables.news, label: "News", href: "/admin/news" },
        { table: Tables.circulars, label: "Circulars", href: "/admin/circulars" },
        { table: Tables.downloads, label: "Downloads", href: "/admin/downloads" },
        { table: Tables.mediaAlbums, label: "Media", href: "/admin/media" },
        { table: Tables.tenders, label: "Tenders", href: "/admin/tenders" },
      ].map(({ table, label, href }) => {
        let query = admin
          .from(table)
          .select("id, title_en, updated_at")
          .eq("status", "pending_review")
          .order("updated_at", { ascending: false })
          .limit(5);
        if (dept) query = dept(query);
        return query.then((result) => ({ result, label, href }));
      }),
    );

    for (const { result, label, href } of pendingQueries) {
      for (const row of result.data ?? []) {
        pendingItems.push({
          id: row.id,
          title: row.title_en,
          module: label,
          href: `${href}/${row.id}`,
          updatedAt: row.updated_at,
        });
      }
    }
  }

  pendingItems.sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  );

  const roleLabel = session.roles.some((r) => r.role === "viewer")
    ? "Viewer"
    : session.roles.some((r) => r.role === "reviewer")
      ? "Reviewer / Approver"
      : "CMS User";

  return {
    roleLabel,
    departmentScoped,
    modules: [
      {
        label: "Pages",
        href: "/admin/pages",
        total: pagesTotal,
        draft: pagesDraft,
        pendingReview: pagesPending,
        live: pagesPublished,
      },
      {
        label: "News & notices",
        href: "/admin/news",
        total: newsTotal,
        draft: newsDraft,
        pendingReview: newsPending,
        live: newsPublished,
      },
      {
        label: "Circulars",
        href: "/admin/circulars",
        total: circularsTotal,
        draft: circularsDraft,
        pendingReview: circularsPending,
        live: circularsPublished,
      },
      {
        label: "Downloads",
        href: "/admin/downloads",
        total: downloadsTotal,
        draft: downloadsDraft,
        pendingReview: downloadsPending,
        live: downloadsPublished,
      },
      {
        label: "Media albums",
        href: "/admin/media",
        total: mediaTotal,
        draft: mediaDraft,
        pendingReview: mediaPending,
        live: mediaPublished,
      },
      {
        label: "Tenders",
        href: "/admin/tenders",
        total: tendersTotal,
        draft: tendersDraft,
        pendingReview: tendersPending,
        live: tendersOpen,
      },
    ],
    feedback: {
      new: feedbackNew,
      inProgress: feedbackInProgress,
      resolved: feedbackResolved,
      total: feedbackTotal,
    },
    tenders: {
      open: tendersOpen,
      pendingReview: tendersPending,
      closingSoon,
    },
    pendingItems: pendingItems.slice(0, 12),
    generatedAt: new Date().toISOString(),
  };
}
