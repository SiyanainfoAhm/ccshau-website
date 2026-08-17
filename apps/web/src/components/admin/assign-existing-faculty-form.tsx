"use client";

import { useState, useTransition } from "react";

import { assignExistingFacultyAction, searchFacultyPeopleAction } from "@/actions/college-register";

type DepartmentOption = {
  id: string;
  title_en: string;
  college_title: string;
};

type PersonHit = {
  id: string;
  name_en: string;
  email: string | null;
  departments: string[];
};

export function AssignExistingFacultyForm({
  departments,
  inDialog = false,
  onCancel,
  onSuccess,
  defaultPersonId,
  defaultPersonName,
  defaultDepartmentPageId,
}: {
  departments: DepartmentOption[];
  inDialog?: boolean;
  onCancel?: () => void;
  onSuccess?: () => void;
  defaultPersonId?: string;
  defaultPersonName?: string;
  defaultDepartmentPageId?: string;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<PersonHit[]>([]);
  const [personId, setPersonId] = useState(defaultPersonId ?? "");
  const [selectedName, setSelectedName] = useState(defaultPersonName ?? "");

  function handleSearch() {
    setError(null);
    startTransition(async () => {
      const rows = await searchFacultyPeopleAction(query);
      setHits(rows.map((row) => ({
        id: row.id,
        name_en: row.name_en,
        email: row.email,
        departments: row.departments,
      })));
      if (rows.length === 0) setError("No matching faculty people. Add a new person instead.");
    });
  }

  function handleSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await assignExistingFacultyAction(formData);
      if (!result.success) {
        setError(result.error);
        return;
      }
      onSuccess?.();
    });
  }

  return (
    <form action={handleSubmit} className="space-y-4">
      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      <input type="hidden" name="personId" value={personId} />
      {defaultDepartmentPageId ? <input type="hidden" name="departmentPageId" value={defaultDepartmentPageId} /> : null}

      {!defaultPersonId ? (
      <label className="block text-sm">
        <span className="font-medium text-slate-700">Search existing faculty</span>
        <div className="mt-1 flex gap-2">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Name or email"
            className="w-full rounded-lg border border-slate-300 px-3 py-2"
          />
          <button
            type="button"
            onClick={handleSearch}
            disabled={isPending || query.trim().length < 2}
            className="rounded-lg border border-emerald-700 px-3 py-2 text-sm font-medium text-emerald-800 hover:bg-emerald-50 disabled:opacity-60"
          >
            Search
          </button>
        </div>
      </label>
      ) : null}

      {!defaultPersonId && hits.length > 0 && (
        <ul className="max-h-40 space-y-1 overflow-y-auto rounded-lg border border-slate-200 p-2 text-sm">
          {hits.map((hit) => (
            <li key={hit.id}>
              <button
                type="button"
                onClick={() => {
                  setPersonId(hit.id);
                  setSelectedName(hit.name_en);
                }}
                className={`w-full rounded px-2 py-1 text-left hover:bg-emerald-50 ${
                  personId === hit.id ? "bg-emerald-100 font-medium" : ""
                }`}
              >
                {hit.name_en}
                {hit.email ? <span className="text-slate-500"> — {hit.email}</span> : null}
                {hit.departments.length > 0 ? (
                  <span className="block text-xs text-slate-500">Also affiliated with: {hit.departments.join(", ")}</span>
                ) : null}
              </button>
            </li>
          ))}
        </ul>
      )}

      {selectedName ? (
        <p className="text-sm text-emerald-800">Assigning: {selectedName}</p>
      ) : (
        <p className="text-xs text-slate-500">Pick a person, then set the designation for this department only.</p>
      )}

      {defaultDepartmentPageId ? null : (
      <label className="block text-sm">
        <span className="font-medium text-slate-700">Department</span>
        <select
          name="departmentPageId"
          required
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
        >
          <option value="">Select department</option>
          {departments.map((d) => (
            <option key={d.id} value={d.id}>
              {d.college_title} → {d.title_en}
            </option>
          ))}
        </select>
      </label>
      )}

      <fieldset>
        <legend className="text-sm font-medium text-slate-700">Member type</legend>
        <div className="mt-2 flex gap-6 text-sm">
          <label className="flex items-center gap-2">
            <input type="radio" name="memberType" value="faculty" defaultChecked />
            Faculty
          </label>
          <label className="flex items-center gap-2">
            <input type="radio" name="memberType" value="hod" />
            Head of Department (HOD)
          </label>
        </div>
      </fieldset>

      <label className="block text-sm">
        <span className="font-medium text-slate-700">Designation for this department</span>
        <input
          name="designationEn"
          required
          placeholder="Assistant Scientist"
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
        />
      </label>
      <label className="block text-sm">
        <span className="font-medium text-slate-700">Designation (Hindi)</span>
        <input name="designationHi" className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-hindi" />
      </label>

      <div className="flex justify-end gap-2 pt-2">
        {inDialog && onCancel ? (
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm"
          >
            Cancel
          </button>
        ) : null}
        <button
          type="submit"
          disabled={isPending || !personId}
          className="rounded-lg bg-ccshau-chrome-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
        >
          {isPending ? "Assigning…" : "Assign to department"}
        </button>
      </div>
    </form>
  );
}
