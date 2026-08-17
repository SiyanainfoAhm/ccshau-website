import type { SupabaseClient } from "@supabase/supabase-js";

import { Tables } from "@/lib/database/names";
import type { FacultyAssignment, FacultyPerson, PageStaff } from "@/lib/database/types";
import type { PublicOfficeStaffMember } from "@/lib/data/public-types";
import { getStoredFileUrl } from "@/lib/storage/urls";
import { isFacultyPeoplePublicForCollege } from "@/lib/settings/site-settings";
import { slugify } from "@/lib/utils/slug";

export function legacyUserIdFromSlug(staffSlug: string | null | undefined): string | null {
  const match = String(staffSlug || "").match(/^legacy-user-(\d+)$/i);
  return match ? match[1] : null;
}

function emptyToNull(value: string | null | undefined): string | null {
  const trimmed = String(value ?? "").trim();
  return trimmed ? trimmed : null;
}

function normalizeEmail(email: string | null | undefined): string | null {
  const value = emptyToNull(email);
  return value ? value.toLowerCase() : null;
}

export type FacultyProfileFields = {
  nameEn: string;
  nameHi?: string | null;
  imagePath?: string | null;
  email?: string | null;
  mobile?: string | null;
  qualificationEn?: string | null;
  qualificationHi?: string | null;
  experienceEn?: string | null;
  experienceHi?: string | null;
  specializationEn?: string | null;
  specializationHi?: string | null;
  detailContentEn?: string | null;
  detailContentHi?: string | null;
};

export type FacultyAssignmentFields = {
  pageId: string;
  sourceStaffId: string;
  staffSlug: string;
  memberType: "hod" | "faculty";
  designationEn: string;
  designationHi?: string | null;
  specializationEn?: string | null;
  specializationHi?: string | null;
  sortOrder: number;
  isActive?: boolean;
  overwritePersonProfile?: boolean;
};

function personRowFromProfile(profile: FacultyProfileFields, extras: { globalSlug: string; legacyUserId: string | null }) {
  return {
    global_slug: extras.globalSlug,
    name_en: profile.nameEn,
    name_hi: emptyToNull(profile.nameHi),
    image_path: emptyToNull(profile.imagePath),
    email: normalizeEmail(profile.email),
    mobile: emptyToNull(profile.mobile),
    qualification_en: emptyToNull(profile.qualificationEn),
    qualification_hi: emptyToNull(profile.qualificationHi),
    experience_en: emptyToNull(profile.experienceEn),
    experience_hi: emptyToNull(profile.experienceHi),
    specialization_en: emptyToNull(profile.specializationEn),
    specialization_hi: emptyToNull(profile.specializationHi),
    detail_content_en: emptyToNull(profile.detailContentEn),
    detail_content_hi: emptyToNull(profile.detailContentHi),
    legacy_user_id: extras.legacyUserId,
    is_active: true,
  };
}

function fillBlankPersonFields(existing: FacultyPerson, incoming: ReturnType<typeof personRowFromProfile>) {
  return {
    name_en: existing.name_en || incoming.name_en,
    name_hi: existing.name_hi || incoming.name_hi,
    image_path: existing.image_path || incoming.image_path,
    email: existing.email || incoming.email,
    mobile: existing.mobile || incoming.mobile,
    qualification_en: existing.qualification_en || incoming.qualification_en,
    qualification_hi: existing.qualification_hi || incoming.qualification_hi,
    experience_en: existing.experience_en || incoming.experience_en,
    experience_hi: existing.experience_hi || incoming.experience_hi,
    specialization_en: existing.specialization_en || incoming.specialization_en,
    specialization_hi: existing.specialization_hi || incoming.specialization_hi,
    detail_content_en: existing.detail_content_en || incoming.detail_content_en,
    detail_content_hi: existing.detail_content_hi || incoming.detail_content_hi,
    legacy_user_id: existing.legacy_user_id || incoming.legacy_user_id,
    is_active: true,
  };
}

async function uniqueGlobalSlug(admin: SupabaseClient, preferred: string, excludePersonId?: string): Promise<string> {
  const base = slugify(preferred) || `faculty-${Date.now()}`;
  for (let i = 0; i < 20; i += 1) {
    const candidate = i === 0 ? base : `${base}-${i + 1}`;
    let query = admin.from(Tables.facultyPeople).select("id").eq("global_slug", candidate);
    if (excludePersonId) query = query.neq("id", excludePersonId);
    const { data } = await query.maybeSingle();
    if (!data) return candidate;
  }
  return `${base}-${crypto.randomUUID().slice(0, 8)}`;
}

async function findPerson(
  admin: SupabaseClient,
  opts: { sourceStaffId: string; staffSlug: string; email: string | null },
): Promise<{ person: FacultyPerson; assignment: FacultyAssignment | null } | null> {
  const { data: byStaff } = await admin
    .from(Tables.facultyAssignments)
    .select("*")
    .eq("source_staff_id", opts.sourceStaffId)
    .maybeSingle();
  if (byStaff) {
    const { data: person } = await admin
      .from(Tables.facultyPeople)
      .select("*")
      .eq("id", (byStaff as FacultyAssignment).person_id)
      .maybeSingle();
    if (person) return { person: person as FacultyPerson, assignment: byStaff as FacultyAssignment };
  }

  const legacyId = legacyUserIdFromSlug(opts.staffSlug);
  if (legacyId) {
    const { data: person } = await admin
      .from(Tables.facultyPeople)
      .select("*")
      .eq("legacy_user_id", legacyId)
      .maybeSingle();
    if (person) return { person: person as FacultyPerson, assignment: null };
  }

  if (opts.email) {
    const { data: people } = await admin
      .from(Tables.facultyPeople)
      .select("*")
      .ilike("email", opts.email)
      .limit(2);
    if (people?.length === 1) return { person: people[0] as FacultyPerson, assignment: null };
  }

  return null;
}

async function propagatePersonToStaffCopies(admin: SupabaseClient, person: FacultyPerson) {
  const { data: assignments } = await admin
    .from(Tables.facultyAssignments)
    .select("source_staff_id, designation_en, designation_hi, specialization_en, specialization_hi, member_type, staff_slug, sort_order, is_active")
    .eq("person_id", person.id);
  const staffIds = (assignments ?? [])
    .map((row) => row.source_staff_id as string | null)
    .filter((id): id is string => Boolean(id));
  if (!staffIds.length) return;

  for (const row of assignments ?? []) {
    if (!row.source_staff_id) continue;
    await admin
      .from(Tables.pageStaff)
      .update({
        name_en: person.name_en,
        name_hi: person.name_hi,
        image_path: person.image_path,
        email: person.email,
        mobile: person.mobile,
        qualification_en: person.qualification_en,
        qualification_hi: person.qualification_hi,
        experience_en: person.experience_en,
        experience_hi: person.experience_hi,
        detail_content_en: person.detail_content_en,
        detail_content_hi: person.detail_content_hi,
        specialization_en: (row.specialization_en as string | null) || person.specialization_en,
        specialization_hi: (row.specialization_hi as string | null) || person.specialization_hi,
      })
      .eq("id", row.source_staff_id);
  }
}

export async function upsertPersonAndAssignment(
  admin: SupabaseClient,
  profile: FacultyProfileFields,
  assignment: FacultyAssignmentFields,
): Promise<{ personId: string; assignmentId: string }> {
  const email = normalizeEmail(profile.email);
  const legacyUserId = legacyUserIdFromSlug(assignment.staffSlug);
  const found = await findPerson(admin, {
    sourceStaffId: assignment.sourceStaffId,
    staffSlug: assignment.staffSlug,
    email,
  });

  const incoming = personRowFromProfile(profile, {
    globalSlug: assignment.staffSlug,
    legacyUserId,
  });

  let personId: string;
  if (found) {
    personId = found.person.id;
    const nextPerson = assignment.overwritePersonProfile
      ? {
          name_en: incoming.name_en,
          name_hi: incoming.name_hi,
          image_path: incoming.image_path,
          email: incoming.email,
          mobile: incoming.mobile,
          qualification_en: incoming.qualification_en,
          qualification_hi: incoming.qualification_hi,
          experience_en: incoming.experience_en,
          experience_hi: incoming.experience_hi,
          specialization_en: found.assignment?.specialization_en
            ? found.person.specialization_en
            : incoming.specialization_en,
          specialization_hi: found.assignment?.specialization_hi
            ? found.person.specialization_hi
            : incoming.specialization_hi,
          detail_content_en: incoming.detail_content_en,
          detail_content_hi: incoming.detail_content_hi,
          legacy_user_id: found.person.legacy_user_id || incoming.legacy_user_id,
          is_active: true,
        }
      : fillBlankPersonFields(found.person, incoming);
    const { error } = await admin.from(Tables.facultyPeople).update(nextPerson).eq("id", personId);
    if (error) throw new Error(error.message);
  } else {
    const globalSlug = await uniqueGlobalSlug(admin, assignment.staffSlug || profile.nameEn);
    const { data, error } = await admin
      .from(Tables.facultyPeople)
      .insert({ ...incoming, global_slug: globalSlug })
      .select("id")
      .single();
    if (error || !data) throw new Error(error?.message ?? "Failed to create faculty person.");
    personId = data.id;
  }

  const { data: existingAssignment } = await admin
    .from(Tables.facultyAssignments)
    .select("*")
    .eq("page_id", assignment.pageId)
    .eq("person_id", personId)
    .maybeSingle();

  const hasOverride = Boolean(existingAssignment?.specialization_en);
  const assignmentPayload = {
    person_id: personId,
    page_id: assignment.pageId,
    source_staff_id: assignment.sourceStaffId,
    designation_en: assignment.designationEn,
    designation_hi: emptyToNull(assignment.designationHi),
    specialization_en: hasOverride || existingAssignment ? emptyToNull(assignment.specializationEn) : null,
    specialization_hi: hasOverride || existingAssignment ? emptyToNull(assignment.specializationHi) : null,
    member_type: assignment.memberType,
    staff_slug: assignment.staffSlug,
    sort_order: assignment.sortOrder,
    is_active: assignment.isActive ?? true,
  };

  let assignmentId: string;
  if (existingAssignment) {
    assignmentId = (existingAssignment as FacultyAssignment).id;
    const { error } = await admin
      .from(Tables.facultyAssignments)
      .update(assignmentPayload)
      .eq("id", assignmentId);
    if (error) throw new Error(error.message);
  } else {
    const { data, error } = await admin
      .from(Tables.facultyAssignments)
      .insert(assignmentPayload)
      .select("id")
      .single();
    if (error || !data) throw new Error(error?.message ?? "Failed to create faculty assignment.");
    assignmentId = data.id;
  }

  const { data: person } = await admin.from(Tables.facultyPeople).select("*").eq("id", personId).maybeSingle();
  if (person) {
    const shared = person as FacultyPerson;
    if (assignment.overwritePersonProfile) {
      await propagatePersonToStaffCopies(admin, shared);
    } else {
      await admin
        .from(Tables.pageStaff)
        .update({
          name_en: shared.name_en,
          name_hi: shared.name_hi,
          image_path: shared.image_path,
          email: shared.email,
          mobile: shared.mobile,
          qualification_en: shared.qualification_en,
          qualification_hi: shared.qualification_hi,
          experience_en: shared.experience_en,
          experience_hi: shared.experience_hi,
          detail_content_en: shared.detail_content_en,
          detail_content_hi: shared.detail_content_hi,
          specialization_en: assignmentPayload.specialization_en || shared.specialization_en,
          specialization_hi: assignmentPayload.specialization_hi || shared.specialization_hi,
        })
        .eq("id", assignment.sourceStaffId);
    }
  }

  return { personId, assignmentId };
}

export async function syncPersonFromPageStaff(
  admin: SupabaseClient,
  staff: PageStaff,
  opts?: { overwritePersonProfile?: boolean },
): Promise<void> {
  if (!staff.staff_slug) return;
  await upsertPersonAndAssignment(
    admin,
    {
      nameEn: staff.name_en,
      nameHi: staff.name_hi,
      imagePath: staff.image_path,
      email: staff.email,
      mobile: staff.mobile,
      qualificationEn: staff.qualification_en,
      qualificationHi: staff.qualification_hi,
      experienceEn: staff.experience_en,
      experienceHi: staff.experience_hi,
      specializationEn: staff.specialization_en,
      specializationHi: staff.specialization_hi,
      detailContentEn: staff.detail_content_en,
      detailContentHi: staff.detail_content_hi,
    },
    {
      pageId: staff.page_id,
      sourceStaffId: staff.id,
      staffSlug: staff.staff_slug,
      memberType: staff.member_type ?? "faculty",
      designationEn: staff.designation_en,
      designationHi: staff.designation_hi,
      specializationEn: staff.specialization_en,
      specializationHi: staff.specialization_hi,
      sortOrder: staff.sort_order,
      isActive: staff.is_active,
      overwritePersonProfile: opts?.overwritePersonProfile ?? true,
    },
  );
}

export async function saveFacultyPersonProfile(
  admin: SupabaseClient,
  personId: string,
  profile: FacultyProfileFields,
): Promise<void> {
  const { data: existing } = await admin.from(Tables.facultyPeople).select("*").eq("id", personId).maybeSingle();
  if (!existing) throw new Error("Faculty person not found.");
  const person = existing as FacultyPerson;
  const incoming = personRowFromProfile(profile, {
    globalSlug: person.global_slug,
    legacyUserId: person.legacy_user_id,
  });
  const { error } = await admin
    .from(Tables.facultyPeople)
    .update({
      name_en: incoming.name_en,
      name_hi: incoming.name_hi,
      image_path: incoming.image_path,
      email: incoming.email,
      mobile: incoming.mobile,
      qualification_en: incoming.qualification_en,
      qualification_hi: incoming.qualification_hi,
      experience_en: incoming.experience_en,
      experience_hi: incoming.experience_hi,
      specialization_en: incoming.specialization_en,
      specialization_hi: incoming.specialization_hi,
      detail_content_en: incoming.detail_content_en,
      detail_content_hi: incoming.detail_content_hi,
      is_active: true,
    })
    .eq("id", personId);
  if (error) throw new Error(error.message);
  const { data: updated } = await admin.from(Tables.facultyPeople).select("*").eq("id", personId).maybeSingle();
  if (updated) await propagatePersonToStaffCopies(admin, updated as FacultyPerson);
}

export async function deactivateAssignmentForStaff(admin: SupabaseClient, sourceStaffId: string): Promise<void> {
  await admin
    .from(Tables.facultyAssignments)
    .update({ is_active: false, source_staff_id: null })
    .eq("source_staff_id", sourceStaffId);
}

export function publicStaffFromPersonAssignment(
  person: FacultyPerson,
  assignment: FacultyAssignment,
  detailHref: string | null,
  alsoAt?: PublicOfficeStaffMember["alsoAt"],
): PublicOfficeStaffMember {
  return {
    nameEn: person.name_en,
    nameHi: person.name_hi,
    designationEn: assignment.designation_en,
    designationHi: assignment.designation_hi,
    specializationEn: assignment.specialization_en || person.specialization_en,
    specializationHi: assignment.specialization_hi || person.specialization_hi,
    imageUrl: person.image_path ? getStoredFileUrl(person.image_path) : null,
    detailHref,
    memberType: assignment.member_type,
    mobile: person.mobile,
    email: person.email,
    experienceEn: person.experience_en,
    experienceHi: person.experience_hi,
    qualificationEn: person.qualification_en,
    qualificationHi: person.qualification_hi,
    detailContentEn: person.detail_content_en,
    detailContentHi: person.detail_content_hi,
    alsoAt,
  };
}

export async function listPublicStaffForPage(
  admin: SupabaseClient,
  pageId: string,
): Promise<PublicOfficeStaffMember[] | null> {
  const { data: page } = await admin
    .from(Tables.pages)
    .select("id, college_root_id")
    .eq("id", pageId)
    .maybeSingle();
  if (!page || !(await isFacultyPeoplePublicForCollege(page.college_root_id))) {
    return null;
  }

  const { data: assignments } = await admin
    .from(Tables.facultyAssignments)
    .select("*")
    .eq("page_id", pageId)
    .eq("is_active", true);
  const rows = (assignments ?? []) as FacultyAssignment[];
  if (!rows.length) return [];

  const personIds = [...new Set(rows.map((row) => row.person_id))];
  const staffIds = rows.map((row) => row.source_staff_id).filter((id): id is string => Boolean(id));
  const [{ data: people }, { data: staffRows }] = await Promise.all([
    admin.from(Tables.facultyPeople).select("*").in("id", personIds).eq("is_active", true),
    staffIds.length
      ? admin.from(Tables.pageStaff).select("id, detail_href").in("id", staffIds)
      : Promise.resolve({ data: [] }),
  ]);
  const personById = new Map(((people ?? []) as FacultyPerson[]).map((p) => [p.id, p]));
  const hrefByStaffId = new Map(
    ((staffRows ?? []) as Array<{ id: string; detail_href: string | null }>).map((row) => [row.id, row.detail_href]),
  );
  const alsoByPerson = await listAlsoAtForPeople(admin, personIds, pageId);

  return rows
    .slice()
    .sort((a, b) => {
      const aHod = a.member_type === "hod" ? 0 : 1;
      const bHod = b.member_type === "hod" ? 0 : 1;
      if (aHod !== bHod) return aHod - bHod;
      if (a.sort_order !== b.sort_order) return a.sort_order - b.sort_order;
      const aName = personById.get(a.person_id)?.name_en || "";
      const bName = personById.get(b.person_id)?.name_en || "";
      return aName.localeCompare(bName);
    })
    .flatMap((assignment) => {
      const person = personById.get(assignment.person_id);
      if (!person) return [];
      const detailHref = assignment.source_staff_id
        ? hrefByStaffId.get(assignment.source_staff_id) ?? null
        : null;
      return [publicStaffFromPersonAssignment(person, assignment, detailHref, alsoByPerson.get(person.id))];
    });
}

export async function getPublicFacultyFromAssignment(
  admin: SupabaseClient,
  pageId: string,
  facultySlug: string,
): Promise<PublicOfficeStaffMember | null> {
  const { data: page } = await admin
    .from(Tables.pages)
    .select("id, college_root_id")
    .eq("id", pageId)
    .maybeSingle();
  if (!page || !(await isFacultyPeoplePublicForCollege(page.college_root_id))) {
    return null;
  }

  const { data: assignment } = await admin
    .from(Tables.facultyAssignments)
    .select("*")
    .eq("page_id", pageId)
    .eq("staff_slug", facultySlug)
    .eq("is_active", true)
    .maybeSingle();
  if (!assignment) return null;

  const { data: person } = await admin
    .from(Tables.facultyPeople)
    .select("*")
    .eq("id", (assignment as FacultyAssignment).person_id)
    .eq("is_active", true)
    .maybeSingle();
  if (!person) return null;

  const row = assignment as FacultyAssignment;
  let detailHref: string | null = null;
  if (row.source_staff_id) {
    const { data: staff } = await admin
      .from(Tables.pageStaff)
      .select("detail_href")
      .eq("id", row.source_staff_id)
      .maybeSingle();
    detailHref = (staff?.detail_href as string | null) ?? null;
  }
  const alsoAt = await listAlsoAt(admin, row.person_id, pageId);
  return publicStaffFromPersonAssignment(person as FacultyPerson, row, detailHref, alsoAt);
}

async function listAlsoAtForPeople(
  admin: SupabaseClient,
  personIds: string[],
  excludePageId: string,
): Promise<Map<string, { titleEn: string; href: string | null }[]>> {
  const result = new Map<string, { titleEn: string; href: string | null }[]>();
  if (!personIds.length) return result;
  const { data: others } = await admin
    .from(Tables.facultyAssignments)
    .select("person_id, page_id, staff_slug")
    .in("person_id", personIds)
    .eq("is_active", true)
    .neq("page_id", excludePageId);
  if (!others?.length) return result;
  const uniquePersonIds = [...new Set(others.map((row) => row.person_id as string))];
  for (const personId of uniquePersonIds) {
    result.set(personId, await listAlsoAt(admin, personId, excludePageId));
  }
  return result;
}

async function listAlsoAt(
  admin: SupabaseClient,
  personId: string,
  excludePageId: string,
): Promise<{ titleEn: string; href: string | null }[]> {
  const { data: others } = await admin
    .from(Tables.facultyAssignments)
    .select("page_id, staff_slug")
    .eq("person_id", personId)
    .eq("is_active", true)
    .neq("page_id", excludePageId);
  if (!others?.length) return [];

  const pageIds = others.map((row) => row.page_id as string);
  const { data: pages } = await admin
    .from(Tables.pages)
    .select("id, title_en, slug, parent_id, college_root_id")
    .in("id", pageIds)
    .eq("status", "published");
  const pageById = new Map((pages ?? []).map((p) => [p.id, p]));

  const parentIds = [...new Set((pages ?? []).map((p) => p.parent_id).filter(Boolean))] as string[];
  const collegeIds = [...new Set((pages ?? []).map((p) => p.college_root_id).filter(Boolean))] as string[];
  const extraIds = [...new Set([...parentIds, ...collegeIds])];
  const { data: extras } = extraIds.length
    ? await admin.from(Tables.pages).select("id, slug").in("id", extraIds)
    : { data: [] };
  const slugById = new Map((extras ?? []).map((p) => [p.id, p.slug as string]));

  return others.flatMap((row) => {
    const page = pageById.get(row.page_id as string);
    if (!page) return [];
    const collegeSlug = page.college_root_id ? slugById.get(page.college_root_id) : null;
    const sectionSlug = page.parent_id ? slugById.get(page.parent_id) : null;
    const staffSlug = row.staff_slug as string | null;
    const href =
      collegeSlug && sectionSlug && page.slug && staffSlug
        ? `/college/${collegeSlug}/${sectionSlug}/${page.slug}/faculty/${staffSlug}`
        : null;
    return [{ titleEn: page.title_en as string, href }];
  });
}

export async function searchFacultyPeople(
  admin: SupabaseClient,
  query: string,
): Promise<Array<FacultyPerson & { departments: string[] }>> {
  const q = query.trim().replace(/[%*,()]/g, "");
  if (q.length < 2) return [];

  const { data: people } = await admin
    .from(Tables.facultyPeople)
    .select("*")
    .eq("is_active", true)
    .or(`name_en.ilike.%${q}%,email.ilike.%${q}%`)
    .order("name_en")
    .limit(20);
  const rows = (people ?? []) as FacultyPerson[];
  if (!rows.length) return [];

  const { data: assignments } = await admin
    .from(Tables.facultyAssignments)
    .select("person_id, page_id")
    .in(
      "person_id",
      rows.map((p) => p.id),
    )
    .eq("is_active", true);
  const pageIds = [...new Set((assignments ?? []).map((a) => a.page_id as string))];
  const { data: pages } = pageIds.length
    ? await admin.from(Tables.pages).select("id, title_en").in("id", pageIds)
    : { data: [] };
  const pageById = new Map((pages ?? []).map((p) => [p.id, p]));

  return rows.map((person) => ({
    ...person,
    departments: (assignments ?? [])
      .filter((a) => a.person_id === person.id)
      .map((a) => pageById.get(a.page_id as string)?.title_en)
      .filter((title): title is string => Boolean(title)),
  }));
}
