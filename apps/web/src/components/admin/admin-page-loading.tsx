export function AdminPageLoading() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Loading page">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-2">
          <div className="h-8 w-48 animate-pulse rounded-lg bg-slate-200" />
          <div className="h-4 w-72 max-w-full animate-pulse rounded bg-slate-100" />
        </div>
        <div className="h-10 w-36 animate-pulse rounded-lg bg-slate-200" />
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 bg-slate-50 px-4 py-3">
          <div className="h-4 w-full max-w-md animate-pulse rounded bg-slate-200" />
        </div>
        <div className="divide-y divide-slate-100 p-2">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="flex gap-4 px-2 py-3">
              <div className="h-4 flex-1 animate-pulse rounded bg-slate-100" />
              <div className="h-4 w-20 animate-pulse rounded bg-slate-100" />
              <div className="h-4 w-16 animate-pulse rounded bg-slate-100" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
