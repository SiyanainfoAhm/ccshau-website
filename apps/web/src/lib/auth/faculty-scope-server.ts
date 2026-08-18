import { cache } from "react";

import type { FacultyPersonSession } from "@/lib/auth/faculty-scope";
import { Tables } from "@/lib/database/names";
import { createAdminClient } from "@/lib/supabase/admin";

export type { FacultyPersonSession };

type PersonRow = {
  id: string;
  name_en: string;
  email: string | null;
  user_id: string | null;
};

function toSession(row: PersonRow): FacultyPersonSession {
  return {
    id: row.id,
    nameEn: row.name_en,
    email: row.email,
  };
}

async function attachUserId(
  userId: string,
  person: PersonRow,
): Promise<FacultyPersonSession | null> {
  if (person.user_id === userId) return toSession(person);
  if (person.user_id) return null;

  const admin = createAdminClient();
  if (!admin) return null;

  const { error } = await admin
    .from(Tables.facultyPeople)
    .update({ user_id: userId })
    .eq("id", person.id)
    .is("user_id", null);

  if (!error) return toSession({ ...person, user_id: userId });

  const { data: latest } = await admin
    .from(Tables.facultyPeople)
    .select("id, name_en, email, user_id")
    .eq("id", person.id)
    .maybeSingle();
  const row = latest as PersonRow | null;
  if (row?.user_id === userId) return toSession(row);
  return null;
}

async function findHodPersonOnDepartmentPage(departmentPageId: string): Promise<PersonRow | null> {
  const admin = createAdminClient();
  if (!admin) return null;

  const { data: assignments } = await admin
    .from(Tables.facultyAssignments)
    .select("person_id")
    .eq("page_id", departmentPageId)
    .eq("member_type", "hod")
    .eq("is_active", true)
    .order("sort_order")
    .limit(1);
  const assignment = assignments?.[0];
  if (!assignment?.person_id) return null;

  const { data: person } = await admin
    .from(Tables.facultyPeople)
    .select("id, name_en, email, user_id")
    .eq("id", assignment.person_id)
    .maybeSingle();
  return (person as PersonRow | null) ?? null;
}

/**
 * Resolve the faculty person linked to this Auth user.
 * Order: explicit user_id, active HOD row on the assigned department page, unique email match.
 */
export const getFacultyPersonForUser = cache(
  async (
    userId: string,
    email: string | null,
    departmentPageId?: string | null,
  ): Promise<FacultyPersonSession | null> => {
    const admin = createAdminClient();
    if (!admin) return null;

    const { data: linked } = await admin
      .from(Tables.facultyPeople)
      .select("id, name_en, email, user_id")
      .eq("user_id", userId)
      .maybeSingle();
    if (linked) return toSession(linked as PersonRow);

    if (departmentPageId) {
      const hodPerson = await findHodPersonOnDepartmentPage(departmentPageId);
      if (hodPerson) {
        const ownHod = await attachUserId(userId, hodPerson);
        if (ownHod) return ownHod;
      }
    }

    const loginEmail = String(email ?? "").trim().toLowerCase();
    if (!loginEmail) return null;

    const { data: matches } = await admin
      .from(Tables.facultyPeople)
      .select("id, name_en, email, user_id")
      .is("user_id", null)
      .ilike("email", loginEmail);

    const rows = ((matches ?? []) as PersonRow[]).filter(
      (row) => String(row.email ?? "").trim().toLowerCase() === loginEmail,
    );
    if (rows.length !== 1) return null;

    return attachUserId(userId, rows[0]);
  },
);
