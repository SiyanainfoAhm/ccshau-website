/** Local development only — pre-filled on admin login */
export const DEV_SUPER_ADMIN = {
  email: "cms.admin@hau.ac.in",
  password: "CcsHau#CMS2026!",
} as const;

export function isDevLoginPrefillEnabled(): boolean {
  return (
    process.env.NODE_ENV === "development" ||
    process.env.NEXT_PUBLIC_DEV_PREFILL_LOGIN === "true"
  );
}
