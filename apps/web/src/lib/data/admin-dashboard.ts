import { listAuditLogs, type AuditLogRow } from "@/actions/audit";
import { getAdminNavAccess, canSeeAdminNavHref } from "@/lib/auth/admin-nav-access";
import {
  canManageUniversityContent,
  isCollegeOnlyUser,
  isSuperAdminSession,
} from "@/lib/auth/college-scope";
import type { AdminSession } from "@/lib/auth/session";
import { Tables } from "@/lib/database/names";
import type { ContentStatus, FeedbackStatus, TenderStatus } from "@/lib/database/types";
import { createAdminClient } from "@/lib/supabase/admin";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type CountQuery = any;

async function countRows(
  table: string | null,
  apply?: (q: CountQuery) => CountQuery,
): Promise<number> {
  const admin = createAdminClient();
  if (!admin || !table) return 0;
  let q = admin.from(table).select("*", { count: "exact", head: true });
  if (apply) q = apply(q);
  const { count } = await q;
  return count ?? 0;
}

export type DashboardAttentionItem = {
  id: string;
  label: string;
  detail: string;
  href: string;
  tone: "amber" | "sky" | "emerald";
};

export type DashboardRecentItem = {
  id: string;
  title: string;
  meta: string;
  href: string;
  status?: string;
};

export type DashboardQuickAction = {
  label: string;
  description: string;
  href: string;
  tone: "primary" | "secondary";
};

export type AdminDashboardData = {
  collegeOnly: boolean;
  canCreateContent: boolean;
  isSuperAdmin: boolean;
  noAccess: boolean;
  roleLabel: string;
  stats: {
    pages: { total: number; published: number; draft: number; pendingReview: number };
    news?: { total: number; published: number; draft: number };
    tenders?: { total: number; open: number; draft: number };
    circulars?: number;
    downloads?: number;
    mediaAlbums?: number;
    banners?: number;
    feedback?: { new: number; inProgress: number; total: number };
  };
  attention: DashboardAttentionItem[];
  recentActivity: DashboardRecentItem[];
  recentAudit: AuditLogRow[];
  quickActions: DashboardQuickAction[];
  pipeline: { label: string; count: number; href: string; status: string }[];
};

function roleLabel(session: AdminSession): string {
  if (isSuperAdminSession(session)) return "Super Admin";
  if (session.collegeAssignment) {
    const map: Record<string, string> = {
      college_admin: "College Admin",
      college_editor: "College Editor",
      college_viewer: "College Viewer",
    };
    return map[session.collegeAssignment.role] ?? "College Staff";
  }
  const role = session.primaryRole;
  const map: Record<string, string> = {
    dept_admin: "Department Admin",
    editor: "Editor",
    viewer: "Viewer",
  };
  return role ? (map[role] ?? role.replace(/_/g, " ")) : "CMS User";
}

export async function getAdminDashboardData(session: AdminSession): Promise<AdminDashboardData> {
  const admin = createAdminClient();
  const collegeOnly = isCollegeOnlyUser(session);
  const canCreate = canManageUniversityContent(session);
  const isSuperAdmin = isSuperAdminSession(session);
  const collegeRootId = session.collegeAssignment?.collegePageId;
  const noAccess = session.roles.length === 0 && !session.collegeAssignment;
  const access = getAdminNavAccess(session);

  const pageFilter = collegeRootId
    ? (q: CountQuery) => q.eq("college_root_id", collegeRootId)
    : undefined;

  const pagesPublished = await countRows(Tables.pages, (q) =>
    (pageFilter ? pageFilter(q) : q).eq("status", "published" satisfies ContentStatus),
  );
  const pagesDraft = await countRows(Tables.pages, (q) =>
    (pageFilter ? pageFilter(q) : q).eq("status", "draft"),
  );
  const pagesPending = await countRows(Tables.pages, (q) =>
    (pageFilter ? pageFilter(q) : q).eq("status", "pending_review"),
  );
  const pagesTotal = await countRows(Tables.pages, pageFilter);

  const stats: AdminDashboardData["stats"] = {
    pages: {
      total: pagesTotal,
      published: pagesPublished,
      draft: pagesDraft,
      pendingReview: pagesPending,
    },
  };

  let recentActivity: DashboardRecentItem[] = [];
  let recentAudit: AuditLogRow[] = [];
  const attention: DashboardAttentionItem[] = [];
  const pipeline: AdminDashboardData["pipeline"] = [];

  if (pagesDraft > 0) {
    pipeline.push({
      label: "Draft pages",
      count: pagesDraft,
      href: "/admin/pages",
      status: "draft",
    });
  }
  if (pagesPending > 0) {
    pipeline.push({
      label: "Pages pending review",
      count: pagesPending,
      href: "/admin/pages",
      status: "pending_review",
    });
    attention.push({
      id: "pages-pending",
      label: `${pagesPending} page${pagesPending === 1 ? "" : "s"} awaiting review`,
      detail: "Review and publish or return to draft.",
      href: "/admin/pages",
      tone: "amber",
    });
  }

  if (!collegeOnly && admin) {
    const [
      newsTotal,
      newsPublished,
      newsDraft,
      tendersTotal,
      tendersOpen,
      tendersDraft,
      circulars,
      downloads,
      mediaAlbums,
      banners,
      feedbackNew,
      feedbackInProgress,
      feedbackTotal,
    ] = await Promise.all([
      countRows(Tables.news),
      countRows(Tables.news, (q) => q.eq("status", "published")),
      countRows(Tables.news, (q) => q.eq("status", "draft")),
      countRows(Tables.tenders),
      countRows(Tables.tenders, (q) => q.eq("status", "open" satisfies TenderStatus)),
      countRows(Tables.tenders, (q) => q.eq("status", "draft")),
      countRows(Tables.circulars),
      countRows(Tables.downloads),
      countRows(Tables.mediaAlbums),
      countRows(Tables.banners),
      countRows(Tables.feedback, (q) => q.eq("status", "new" satisfies FeedbackStatus)),
      countRows(Tables.feedback, (q) => q.eq("status", "in_progress")),
      countRows(Tables.feedback),
    ]);

    stats.news = { total: newsTotal, published: newsPublished, draft: newsDraft };
    stats.tenders = { total: tendersTotal, open: tendersOpen, draft: tendersDraft };
    stats.circulars = circulars;
    stats.downloads = downloads;
    stats.mediaAlbums = mediaAlbums;
    stats.banners = banners;
    stats.feedback = { new: feedbackNew, inProgress: feedbackInProgress, total: feedbackTotal };

    if (newsDraft > 0) {
      pipeline.push({ label: "Draft news", count: newsDraft, href: "/admin/news", status: "draft" });
    }
    if (tendersDraft > 0) {
      pipeline.push({ label: "Draft tenders", count: tendersDraft, href: "/admin/tenders", status: "draft" });
    }

    if (feedbackNew > 0) {
      attention.push({
        id: "feedback-new",
        label: `${feedbackNew} new feedback submission${feedbackNew === 1 ? "" : "s"}`,
        detail: "Public contact form messages waiting for a response.",
        href: "/admin/feedback?status=new",
        tone: "sky",
      });
    }
    if (feedbackInProgress > 0) {
      attention.push({
        id: "feedback-progress",
        label: `${feedbackInProgress} feedback ticket${feedbackInProgress === 1 ? "" : "s"} in progress`,
        detail: "Follow up and mark resolved when complete.",
        href: "/admin/feedback?status=in_progress",
        tone: "amber",
      });
    }

    const closingSoon = new Date();
    closingSoon.setDate(closingSoon.getDate() + 14);
    const { data: expiringTenders } = await admin
      .from(Tables.tenders)
      .select("id, title_en, closing_date")
      .eq("status", "open")
      .not("closing_date", "is", null)
      .lte("closing_date", closingSoon.toISOString().slice(0, 10))
      .order("closing_date", { ascending: true })
      .limit(3);

    for (const tender of expiringTenders ?? []) {
      attention.push({
        id: `tender-${tender.id}`,
        label: `Tender closing soon: ${tender.title_en}`,
        detail: tender.closing_date
          ? `Closes ${new Date(tender.closing_date).toLocaleDateString("en-IN")}`
          : "Review before deadline.",
        href: `/admin/tenders/${tender.id}`,
        tone: "amber",
      });
    }

    const [{ data: recentNews }, { data: recentFeedback }] = await Promise.all([
      admin
        .from(Tables.news)
        .select("id, title_en, slug, status, updated_at")
        .order("updated_at", { ascending: false })
        .limit(5),
      admin
        .from(Tables.feedback)
        .select("id, ticket_number, submitter_name, status, created_at")
        .in("status", ["new", "in_progress"])
        .order("created_at", { ascending: false })
        .limit(5),
    ]);

    recentActivity = [
      ...(recentNews ?? []).map((item) => ({
        id: item.id,
        title: item.title_en,
        meta: new Date(item.updated_at).toLocaleString("en-IN"),
        href: `/admin/news/${item.id}`,
        status: item.status,
      })),
      ...(recentFeedback ?? []).map((item) => ({
        id: item.id,
        title: item.submitter_name || item.ticket_number,
        meta: item.ticket_number,
        href: `/admin/feedback/${item.id}`,
        status: item.status,
      })),
    ].slice(0, 8);

    if (isSuperAdmin) {
      recentAudit = (await listAuditLogs({ limit: 8 })).items;
    }
  }

  if (collegeOnly && admin && collegeRootId) {
    const { data: collegePages } = await admin
      .from(Tables.pages)
      .select("id, title_en, slug, status, updated_at")
      .eq("college_root_id", collegeRootId)
      .order("updated_at", { ascending: false })
      .limit(8);

    recentActivity = (collegePages ?? []).map((page) => ({
      id: page.id,
      title: page.title_en,
      meta: new Date(page.updated_at).toLocaleString("en-IN"),
      href: `/admin/pages/${page.id}`,
      status: page.status,
    }));
  } else if (admin && recentActivity.length < 6) {
    let pagesQuery = admin
      .from(Tables.pages)
      .select("id, title_en, slug, status, updated_at")
      .order("updated_at", { ascending: false })
      .limit(6);
    if (collegeRootId) pagesQuery = pagesQuery.eq("college_root_id", collegeRootId);
    const { data: recentPages } = await pagesQuery;
    const pageItems = (recentPages ?? []).map((page) => ({
      id: page.id,
      title: page.title_en,
      meta: new Date(page.updated_at).toLocaleString("en-IN"),
      href: `/admin/pages/${page.id}`,
      status: page.status,
    }));
    recentActivity = [...pageItems, ...recentActivity].slice(0, 8);
  }

  const quickActions: DashboardQuickAction[] = [];
  const navAllowed = (href: string) => {
    if (canSeeAdminNavHref(access, href)) return true;
    const parent = href.replace(/\/new$/, "");
    return parent !== href && canSeeAdminNavHref(access, parent);
  };
  const addAction = (
    label: string,
    description: string,
    href: string,
    tone: DashboardQuickAction["tone"] = "secondary",
  ) => {
    if (!navAllowed(href)) return;
    quickActions.push({ label, description, href, tone });
  };

  if (canCreate) {
    addAction("New news", "Publish a notice or article", "/admin/news/new", "primary");
    addAction("New tender", "Add tender with documents", "/admin/tenders/new", "primary");
    addAction("New circular", "Upload official circular", "/admin/circulars/new");
    addAction("New page", "Create CMS page", "/admin/pages/new");
    addAction("New download", "Add downloadable file", "/admin/downloads/new");
    addAction("Media album", "Photo or video gallery", "/admin/media/new");
    addAction("Banner slide", "Homepage carousel image", "/admin/banners/new");
  }

  addAction("Manage pages", "Edit site structure & content", "/admin/pages");
  if (!collegeOnly) {
    addAction("Feedback inbox", "Visitor enquiries", "/admin/feedback");
    addAction("Homepage CMS", "Quotes, dignitaries, CTA", "/admin/homepage");
    addAction("Menus", "Header & footer links", "/admin/menus");
  }
  if (access.isSuperAdmin) {
    addAction("Microsite setup", "Colleges & directorates", "/admin/register");
    addAction("Users & roles", "Access control", "/admin/users");
  }
  if (collegeOnly) {
    addAction("Microsite setup", "Departments & faculty", "/admin/register");
  }

  return {
    collegeOnly,
    canCreateContent: canCreate,
    isSuperAdmin,
    noAccess,
    roleLabel: roleLabel(session),
    stats,
    attention,
    recentActivity,
    recentAudit,
    quickActions: quickActions.slice(0, 10),
    pipeline,
  };
}
