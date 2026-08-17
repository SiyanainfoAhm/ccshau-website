/**
 * Resolve page ids that carry faculty/staff for a microsite root.
 * Child office_portal pages + root when it has active staff (research stations).
 */
export async function resolveStaffPageIds(supabase, collegeId, { publishedOnly = false } = {}) {
  let childQuery = supabase
    .from("ccshau_pages")
    .select("id, slug, title_en, parent_id, layout_template, status")
    .eq("college_root_id", collegeId)
    .neq("id", collegeId)
    .eq("layout_template", "office_portal");
  if (publishedOnly) childQuery = childQuery.eq("status", "published");

  const { data: childPages, error: childErr } = await childQuery;
  if (childErr) throw new Error(childErr.message);

  const pageIds = (childPages || []).map((p) => p.id);
  const pageById = new Map((childPages || []).map((p) => [p.id, p]));

  const { count: rootStaffCount, error: rootCountErr } = await supabase
    .from("ccshau_page_staff")
    .select("id", { count: "exact", head: true })
    .eq("page_id", collegeId)
    .eq("is_active", true);
  if (rootCountErr) throw new Error(rootCountErr.message);

  if ((rootStaffCount ?? 0) > 0 && !pageIds.includes(collegeId)) {
    const { data: rootPage, error: rootErr } = await supabase
      .from("ccshau_pages")
      .select("id, slug, title_en, parent_id, layout_template, status")
      .eq("id", collegeId)
      .maybeSingle();
    if (rootErr) throw new Error(rootErr.message);
    const rootPublished = !publishedOnly || rootPage?.status === "published";
    if (rootPage?.layout_template === "office_portal" && rootPublished) {
      pageIds.push(collegeId);
      pageById.set(collegeId, rootPage);
    }
  }

  return {
    pageIds,
    pageById,
    childPages: childPages || [],
    includesRootStaff: pageIds.includes(collegeId),
  };
}
