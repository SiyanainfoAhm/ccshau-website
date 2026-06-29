import { notFound } from "next/navigation";

import { getFeedbackById, listDepartments } from "@/actions/feedback";
import { FeedbackDetailPanel } from "@/components/admin/feedback-detail-panel";
import { requireAdminSession } from "@/lib/auth/session";

export default async function AdminFeedbackDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdminSession();
  const { id } = await params;
  const [feedback, departments] = await Promise.all([getFeedbackById(id), listDepartments()]);

  if (!feedback) notFound();

  return <FeedbackDetailPanel feedback={feedback} departments={departments} />;
}
