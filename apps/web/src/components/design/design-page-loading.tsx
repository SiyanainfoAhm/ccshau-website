export function DesignPageLoading() {
  return (
    <div className="min-h-[50vh] space-y-8 px-4 py-12" aria-busy="true" aria-label="Loading page">
      <div className="mx-auto max-w-6xl space-y-4">
        <div className="h-10 w-64 animate-pulse rounded-lg bg-emerald-900/10" />
        <div className="h-5 w-96 max-w-full animate-pulse rounded bg-emerald-900/5" />
      </div>
      <div className="mx-auto max-w-6xl grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <div
            key={index}
            className="h-40 animate-pulse rounded-2xl border border-emerald-900/10 bg-white/60"
          />
        ))}
      </div>
    </div>
  );
}
