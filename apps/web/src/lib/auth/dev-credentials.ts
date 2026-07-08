/** Local development only — pre-filled on admin login */
export const DEV_SUPER_ADMIN = {
  email: "cms.admin@hau.ac.in",
  password: "Admin@123",
} as const;

export const DEV_CONTENT_EDITOR = {
  email: "test.editor@ccshau.test",
  password: "Admin@123",
} as const;

export function getDevLoginPrefill() {
  const role = process.env.NEXT_PUBLIC_DEV_LOGIN_ROLE;
  if (role === "content_editor") return DEV_CONTENT_EDITOR;
  return DEV_SUPER_ADMIN;
}

export function isDevLoginPrefillEnabled(): boolean {
  return (
    process.env.NODE_ENV === "development" ||
    process.env.NEXT_PUBLIC_DEV_PREFILL_LOGIN === "true"
  );
}
