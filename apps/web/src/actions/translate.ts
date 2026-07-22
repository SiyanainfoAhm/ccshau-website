"use server";

import { requireAdminSession } from "@/lib/auth/session";
import { translateEnToHi, translateFieldsEnToHi } from "@/lib/i18n/translate";
import { fail, ok, type ActionResult } from "@/lib/types/action-result";

export async function translateEnToHiAction(
  text: string,
  format: "text" | "html" = "text",
): Promise<ActionResult<string>> {
  try {
    await requireAdminSession();
    if (!text.trim()) return fail("Nothing to translate.");
    const translated = await translateEnToHi(text, format);
    return ok(translated);
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Translation failed.");
  }
}

export async function translateFieldsEnToHiAction(
  fields: { key: string; text: string; format?: "text" | "html" }[],
): Promise<ActionResult<{ translations: Record<string, string>; warnings: string[] }>> {
  try {
    await requireAdminSession();
    const nonEmpty = fields.filter((field) => field.text.trim());
    if (nonEmpty.length === 0) return fail("Enter English text before translating.");
    const result = await translateFieldsEnToHi(nonEmpty);
    return ok(result);
  } catch (e) {
    return fail(e instanceof Error ? e.message : "Translation failed.");
  }
}
