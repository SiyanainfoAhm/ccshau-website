import type { ContentStatus, PageStatus } from "@/lib/database/types";

export const CONTENT_STATUS_OPTIONS: { value: ContentStatus; label: string }[] = [
  { value: "draft", label: "Draft" },
  { value: "pending_review", label: "Pending review" },
  { value: "published", label: "Published" },
  { value: "archived", label: "Archived" },
];

/** Editors without publish permission should submit for review instead of publishing directly. */
export function contentStatusOptions(canPublish: boolean) {
  if (canPublish) return CONTENT_STATUS_OPTIONS;
  return CONTENT_STATUS_OPTIONS.filter((option) => option.value !== "published");
}

export function pageStatusOptions(canPublish: boolean, canDelete: boolean) {
  const options: { value: PageStatus; label: string }[] = [...contentStatusOptions(canPublish)];
  if (canDelete) options.push({ value: "deleted", label: "Deleted" });
  return options;
}
