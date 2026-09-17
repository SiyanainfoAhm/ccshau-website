"use server";

import { writeAuditLog } from "@/lib/auth/audit";
import { SETTINGS_ACCESS_ROLES } from "@/lib/auth/cms-roles";
import { requireAdminWithRoles } from "@/lib/auth/session";
import { getStoredFileUrl, uploadManualPublicFile } from "@/lib/storage/upload";
import { getAzureBlobBaseUrl } from "@/lib/storage/urls";
import { fail, ok, type ActionResult } from "@/lib/types/action-result";

export async function uploadToAzureAction(
  formData: FormData,
): Promise<ActionResult<{ url: string }>> {
  try {
    const session = await requireAdminWithRoles([...SETTINGS_ACCESS_ROLES]);
    const value = formData.get("file");
    if (!(value instanceof File) || value.size === 0) {
      return fail("Select an image or document to upload.");
    }
    if (!getAzureBlobBaseUrl()) {
      return fail("The public Azure Storage URL is not configured.");
    }

    const upload = await uploadManualPublicFile(value);
    if (!upload.success) return upload;

    const url = getStoredFileUrl(upload.data);
    if (!url) return fail("Upload completed, but the public Azure URL is not configured.");

    await writeAuditLog({
      userId: session.userId,
      action: "create",
      entityType: "azure_upload",
      details: {
        name: value.name,
        size: value.size,
        type: value.type,
        storedPath: upload.data,
      },
    });

    return ok({ url });
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Azure upload failed.");
  }
}
