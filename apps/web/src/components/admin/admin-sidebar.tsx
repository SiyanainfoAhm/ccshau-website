"use client";

import Link, { useLinkStatus } from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import {
  ArrowRightLeft,
  BarChart3,
  Building2,
  ClipboardList,
  Download,
  FileText,
  GraduationCap,
  Home,
  Image,
  LayoutDashboard,
  Link2,
  Loader2,
  Megaphone,
  Menu,
  MessageSquare,
  Newspaper,
  ScrollText,
  Settings,
  ShoppingBag,
  Users,
  UserRound,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import {
  canAccessAdminPath,
  canSeeAdminNavHref,
  type AdminNavAccess,
} from "@/lib/auth/admin-nav-access";

export type AdminNavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  exact?: boolean;
};

const baseNavItems: AdminNavItem[] = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/admin/reports", label: "Reports", icon: BarChart3 },
  { href: "/admin/pages", label: "Pages", icon: FileText },
  { href: "/admin/news", label: "News & Notices", icon: Newspaper },
  { href: "/admin/circulars", label: "Circulars", icon: ScrollText },
  { href: "/admin/tenders", label: "Tenders", icon: ShoppingBag },
  { href: "/admin/downloads", label: "Downloads", icon: Download },
  { href: "/admin/feedback", label: "Feedback", icon: MessageSquare },
  { href: "/admin/menus", label: "Menus", icon: Menu },
  { href: "/admin/related-links", label: "Related links", icon: Link2 },
  { href: "/admin/redirects", label: "URL redirects", icon: ArrowRightLeft },
  { href: "/admin/media", label: "Media", icon: Image },
  { href: "/admin/banners", label: "Banners", icon: Megaphone },
  { href: "/admin/homepage", label: "Homepage", icon: Home },
  { href: "/admin/audit", label: "Audit log", icon: ClipboardList },
  { href: "/admin/settings", label: "Settings", icon: Settings },
];

const superAdminNavItems: AdminNavItem[] = [
  { href: "/admin/register", label: "Microsite setup", icon: Building2 },
  { href: "/admin/pg-seminar-registrations", label: "PG registrations", icon: GraduationCap },
  { href: "/admin/users", label: "Users & roles", icon: Users },
];

const collegeOnlyNavItems: AdminNavItem[] = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/admin/register", label: "Microsite setup", icon: Building2 },
  { href: "/admin/pages", label: "College pages", icon: FileText },
];

const departmentHodCoreNavItems: AdminNavItem[] = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/admin/pages", label: "My department", icon: FileText },
];

const facultyOnlyNavItems: AdminNavItem[] = [
  { href: "/admin/register/faculty/me", label: "My profile", icon: UserRound },
];

export function getSidebarNavItems(access: AdminNavAccess): AdminNavItem[] {
  if (access.isFacultyOnly) return facultyOnlyNavItems;
  if (access.isDepartmentHodOnly) {
    return access.hasFacultyPerson
      ? [facultyOnlyNavItems[0], ...departmentHodCoreNavItems]
      : departmentHodCoreNavItems;
  }
  if (access.isCollegeOnly) {
    return access.hasFacultyPerson
      ? [facultyOnlyNavItems[0], ...collegeOnlyNavItems]
      : collegeOnlyNavItems;
  }

  const visibleBase = baseNavItems.filter((item) => canSeeAdminNavHref(access, item.href));
  const withProfile = access.hasFacultyPerson
    ? [facultyOnlyNavItems[0], ...visibleBase]
    : visibleBase;

  if (!access.isSuperAdmin) return withProfile;

  const settings = withProfile.find((item) => item.href === "/admin/settings");
  const withoutSettings = withProfile.filter((item) => item.href !== "/admin/settings");
  return [...withoutSettings, ...superAdminNavItems, ...(settings ? [settings] : [])];
}

function NavPendingIndicator() {
  const { pending } = useLinkStatus();
  if (!pending) return <span className="ml-auto h-3 w-3 shrink-0" aria-hidden />;

  return (
    <Loader2
      className="ml-auto h-3.5 w-3.5 shrink-0 animate-spin text-amber-300"
      aria-label="Loading"
    />
  );
}

function AdminRouteGuard({ access }: { access: AdminNavAccess }) {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (!canAccessAdminPath(access, pathname)) {
      router.replace("/admin");
    }
  }, [access, pathname, router]);

  return null;
}

export function AdminSidebar({
  access,
  collegeName,
}: {
  access: AdminNavAccess;
  collegeName?: string | null;
}) {
  const pathname = usePathname();
  const items = getSidebarNavItems(access);

  return (
    <>
      <AdminRouteGuard access={access} />
      <aside className="flex w-64 shrink-0 flex-col border-r border-emerald-900/10 bg-ccshau-chrome-900 text-emerald-50">
        <div className="border-b border-white/10 px-5 py-6">
          <Link href="/admin" className="block">
            <p className="font-display text-xl font-bold text-gradient-gold">CCSHAU</p>
            <p className="mt-1 text-xs text-emerald-200/80">
              {(access.isCollegeOnly || access.isDepartmentHodOnly || access.isFacultyOnly) &&
              collegeName
                ? collegeName
                : "Content Management"}
            </p>
          </Link>
        </div>
        <nav className="flex-1 space-y-1 p-3">
          {items.map((item) => {
            const active = item.exact
              ? pathname === item.href
              : pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                prefetch={false}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                  active
                    ? "bg-amber-400/20 text-amber-200"
                    : "text-emerald-100/85 hover:bg-white/10 hover:text-white"
                }`}
              >
                <item.icon className="h-4 w-4 shrink-0" aria-hidden />
                {item.label}
                <NavPendingIndicator />
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-white/10 p-4 text-xs text-emerald-300/70">
          <Link href="/" className="hover:text-amber-200">
            ← View public site
          </Link>
        </div>
      </aside>
    </>
  );
}
