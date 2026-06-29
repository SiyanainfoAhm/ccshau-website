"use client";

import { useRouter, useSearchParams } from "next/navigation";

import type { AuditAction } from "@/lib/database/types";

const ACTIONS: AuditAction[] = [
  "login",
  "logout",
  "create",
  "update",
  "delete",
  "publish",
  "unpublish",
  "upload",
  "archive",
  "lockout",
];

export function AuditLogFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const action = searchParams.get("action") ?? "";
  const entityType = searchParams.get("entityType") ?? "";

  function updateFilter(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    router.push(`/admin/audit?${params.toString()}`);
  }

  return (
    <div className="flex flex-wrap gap-3">
      <select
        value={action}
        onChange={(e) => updateFilter("action", e.target.value)}
        className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
      >
        <option value="">All actions</option>
        {ACTIONS.map((a) => (
          <option key={a} value={a}>
            {a.replace(/_/g, " ")}
          </option>
        ))}
      </select>
      <input
        type="text"
        placeholder="Entity type (e.g. page, news)"
        defaultValue={entityType}
        onBlur={(e) => updateFilter("entityType", e.target.value.trim())}
        className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
      />
    </div>
  );
}
