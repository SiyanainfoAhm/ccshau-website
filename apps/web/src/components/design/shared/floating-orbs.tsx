export function FloatingOrbs({ variant = "future" }: { variant?: "future" | "heritage" }) {
  if (variant === "heritage") {
    return (
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
        <div className="animate-float absolute -left-16 top-1/4 h-80 w-80 rounded-full bg-rose-300/25 blur-3xl" />
        <div
          className="animate-float absolute -right-10 top-1/5 h-96 w-96 rounded-full bg-sky-300/20 blur-3xl"
          style={{ animationDelay: "1.2s" }}
        />
        <div
          className="animate-float absolute bottom-1/4 left-1/3 h-72 w-72 rounded-full bg-amber-300/22 blur-3xl"
          style={{ animationDelay: "0.6s" }}
        />
        <div
          className="animate-float absolute right-1/4 bottom-1/3 h-64 w-64 rounded-full bg-violet-300/20 blur-3xl"
          style={{ animationDelay: "2s" }}
        />
        <div
          className="animate-float absolute left-1/2 top-1/2 h-48 w-48 rounded-full bg-teal-300/15 blur-3xl"
          style={{ animationDelay: "1.8s" }}
        />
      </div>
    );
  }

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      <div className="animate-float absolute -left-20 top-1/4 h-72 w-72 rounded-full bg-amber-400/20 blur-3xl" />
      <div
        className="animate-float absolute right-0 top-1/3 h-96 w-96 rounded-full bg-emerald-400/15 blur-3xl"
        style={{ animationDelay: "1.5s" }}
      />
      <div
        className="animate-float absolute bottom-1/4 left-1/3 h-64 w-64 rounded-full bg-teal-300/10 blur-3xl"
        style={{ animationDelay: "0.8s" }}
      />
    </div>
  );
}
