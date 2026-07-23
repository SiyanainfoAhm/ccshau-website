/**
 * Dev login helpers.
 * Never ship real passwords in the client bundle — only an optional email prefill
 * when running a true local `next dev` (NODE_ENV === "development").
 */
export const DEV_SUPER_ADMIN_EMAIL = "cms.admin@hau.ac.in";
export const DEV_CONTENT_EDITOR_EMAIL = "test.editor@ccshau.test";

export function getDevLoginPrefillEmail(): string | null {
  if (process.env.NODE_ENV !== "development") return null;
  const role = process.env.NEXT_PUBLIC_DEV_LOGIN_ROLE;
  if (role === "content_editor") return DEV_CONTENT_EDITOR_EMAIL;
  return DEV_SUPER_ADMIN_EMAIL;
}

export function isDevLoginPrefillEnabled(): boolean {
  return process.env.NODE_ENV === "development";
}
