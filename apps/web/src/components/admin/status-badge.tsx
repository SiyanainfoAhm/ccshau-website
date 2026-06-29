const styles: Record<string, string> = {
  draft: "bg-slate-100 text-slate-700",
  pending_review: "bg-amber-100 text-amber-800",
  published: "bg-emerald-100 text-emerald-800",
  archived: "bg-slate-200 text-slate-600",
  open: "bg-emerald-100 text-emerald-800",
  closed: "bg-amber-100 text-amber-800",
  new: "bg-sky-100 text-sky-800",
  in_progress: "bg-violet-100 text-violet-800",
  resolved: "bg-emerald-100 text-emerald-800",
};

export function StatusBadge({ status }: { status: string }) {
  const label = status.replace(/_/g, " ");
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${styles[status] ?? "bg-slate-100 text-slate-700"}`}
    >
      {label}
    </span>
  );
}
