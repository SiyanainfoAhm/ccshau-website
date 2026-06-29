"use server";

import { headers } from "next/headers";

import { verifyCaptcha } from "@/lib/auth/captcha";
import { generateFeedbackTicketNumber } from "@/lib/data/public";
import { Tables } from "@/lib/database/names";
import { sendFeedbackReceivedEmail } from "@/lib/power-automate/send";
import { fail, ok, type ActionResult } from "@/lib/types/action-result";
import { publicFeedbackSchema } from "@/lib/validations/public-feedback";
import { createAdminClient } from "@/lib/supabase/admin";

export async function submitPublicFeedbackAction(
  formData: FormData,
): Promise<ActionResult<{ ticketNumber: string }>> {
  const parsed = publicFeedbackSchema.safeParse({
    submitterName: formData.get("submitterName"),
    email: formData.get("email"),
    phone: formData.get("phone") || undefined,
    category: formData.get("category") || undefined,
    departmentId: formData.get("departmentId") || "",
    subject: formData.get("subject"),
    message: formData.get("message"),
    captchaToken: formData.get("captchaToken") || undefined,
  });

  if (!parsed.success) {
    return fail("Validation failed", parsed.error.flatten().fieldErrors);
  }

  if (!(await verifyCaptcha(parsed.data.captchaToken))) {
    return fail("CAPTCHA verification failed. Please try again.");
  }

  const admin = createAdminClient();
  if (!admin) return fail("Service temporarily unavailable.");

  const ticketNumber = await generateFeedbackTicketNumber();
  if (!ticketNumber) return fail("Could not generate ticket number. Please try again.");

  const headerStore = await headers();
  const ipAddress = headerStore.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
  const userAgent = headerStore.get("user-agent");

  let departmentName: string | null = null;
  if (parsed.data.departmentId) {
    const { data: dept } = await admin
      .from(Tables.departments)
      .select("name_en")
      .eq("id", parsed.data.departmentId)
      .maybeSingle();
    departmentName = (dept?.name_en as string) ?? null;
  }

  const { error } = await admin.from(Tables.feedback).insert({
    ticket_number: ticketNumber,
    submitter_name: parsed.data.submitterName,
    email: parsed.data.email,
    phone: parsed.data.phone || null,
    category: parsed.data.category || null,
    department_id: parsed.data.departmentId || null,
    subject: parsed.data.subject,
    message: parsed.data.message,
    status: "new",
    ip_address: ipAddress,
    user_agent: userAgent,
  });

  if (error) return fail("Submission failed. Please try again later.");

  await sendFeedbackReceivedEmail({
    ticketNumber,
    submitterName: parsed.data.submitterName,
    email: parsed.data.email,
    subject: parsed.data.subject,
    category: parsed.data.category ?? null,
    departmentName,
  });

  return ok({ ticketNumber });
}
