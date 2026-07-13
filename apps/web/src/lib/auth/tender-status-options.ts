import type { TenderStatus } from "@/lib/database/types";

export const TENDER_STATUS_OPTIONS: { value: TenderStatus; label: string }[] = [
  { value: "draft", label: "Draft" },
  { value: "pending_review", label: "Pending review" },
  { value: "open", label: "Open (live)" },
  { value: "closed", label: "Closed" },
  { value: "cancelled", label: "Cancelled" },
  { value: "archived", label: "Archived" },
];

/** Editors without publish permission submit for review instead of opening directly. */
export function tenderStatusOptions(canPublish: boolean) {
  if (canPublish) return TENDER_STATUS_OPTIONS;
  return TENDER_STATUS_OPTIONS.filter((option) => option.value !== "open");
}
