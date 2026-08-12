import { z } from "zod";

/** Split "a@x.com, b@y.com" / "a@x.com; b@y.com" into trimmed parts. */
export function parseContactEmails(value: string): string[] {
  return value
    .split(/[,;]+/)
    .map((part) => part.trim())
    .filter(Boolean);
}

/** Normalize to a comma-separated string (preserves all entries; no format check). */
export function normalizeContactEmails(value: string): string {
  return parseContactEmails(value).join(", ");
}

/**
 * College contact email field: free text, optionally comma/semicolon-separated.
 * Format validation intentionally not enforced (legacy contacts may list multiple addresses).
 */
export function collegeContactEmailsSchema(options?: {
  required?: boolean;
  requiredMessage?: string;
}) {
  const required = options?.required ?? false;
  const requiredMessage = options?.requiredMessage ?? "Email is required";

  return z
    .string()
    .optional()
    .or(z.literal(""))
    .superRefine((value, ctx) => {
      const raw = (value ?? "").trim();
      if (!raw && required) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: requiredMessage });
      }
    })
    .transform((value) => {
      const raw = (value ?? "").trim();
      if (!raw) return "";
      return normalizeContactEmails(raw);
    });
}
