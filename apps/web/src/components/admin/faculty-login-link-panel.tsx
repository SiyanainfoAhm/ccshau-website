"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import {
  linkFacultyLoginAction,
  unlinkFacultyLoginAction,
  type FacultyLoginLink,
} from "@/actions/college-register";

export function FacultyLoginLinkPanel({
  personId,
  link,
  defaultEmail,
  canCreateLogin,
}: {
  personId: string;
  link: FacultyLoginLink | null;
  defaultEmail: string | null;
  canCreateLogin: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleLink(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await linkFacultyLoginAction(personId, formData);
      if (!result.success) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  function handleUnlink() {
    if (!confirm("Remove this faculty member's login? They will no longer be able to edit My profile.")) {
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await unlinkFacultyLoginAction(personId);
      if (!result.success) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <section className="space-y-3 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <div>
        <h2 className="text-lg font-semibold text-slate-900">Faculty login</h2>
        <p className="mt-1 text-sm text-slate-500">
          Link an admin login so this person can update only their own profile (name, photo, mobile,
          specialization, Other Activities). They cannot change designation, department assignments,
          or anyone else’s profile.
        </p>
      </div>

      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      {link?.userId ? (
        <div className="rounded-lg border border-emerald-100 bg-emerald-50/60 px-4 py-3 text-sm">
          <p className="font-medium text-emerald-900">Login linked</p>
          <p className="mt-1 text-emerald-800">
            {link.displayName ? `${link.displayName} · ` : ""}
            {link.email ?? "No email on profile"}
          </p>
          <button
            type="button"
            onClick={handleUnlink}
            disabled={isPending}
            className="mt-3 text-sm font-medium text-red-700 hover:underline disabled:opacity-50"
          >
            Unlink login
          </button>
        </div>
      ) : (
        <form action={handleLink} className="grid gap-3 md:grid-cols-2">
          <label className="block text-sm md:col-span-2">
            <span className="font-medium text-slate-700">Login email</span>
            <input
              name="email"
              type="email"
              required
              defaultValue={defaultEmail ?? ""}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
            />
          </label>
          {canCreateLogin ? (
            <label className="block text-sm md:col-span-2">
              <span className="font-medium text-slate-700">Password (to create a new login)</span>
              <input
                name="password"
                type="password"
                minLength={8}
                autoComplete="new-password"
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
              />
              <span className="mt-1 block text-xs text-slate-500">
                Leave blank to link an existing user. Enter 8+ characters to create a new login.
              </span>
            </label>
          ) : (
            <p className="text-xs text-slate-500 md:col-span-2">
              The user must already exist under Users & roles. Super admin can also create a login
              here with a password.
            </p>
          )}
          <div>
            <button
              type="submit"
              disabled={isPending}
              className="rounded-lg bg-ccshau-chrome-900 px-4 py-2 text-sm font-semibold text-white hover:bg-ccshau-chrome-800 disabled:opacity-50"
            >
              {isPending ? "Saving…" : "Link login"}
            </button>
          </div>
        </form>
      )}
    </section>
  );
}
