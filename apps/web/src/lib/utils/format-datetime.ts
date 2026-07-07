const ADMIN_DISPLAY_TIMEZONE = "Asia/Kolkata";

/** Stable date/time display for admin UI (explicit locale + timezone avoids SSR hydration mismatch). */
export function formatAdminDateTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;

  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
    timeZone: ADMIN_DISPLAY_TIMEZONE,
  }).format(date);
}

export function isExpiredAt(iso: string, nowMs = Date.now()): boolean {
  const expiresMs = new Date(iso).getTime();
  return !Number.isNaN(expiresMs) && expiresMs <= nowMs;
}
