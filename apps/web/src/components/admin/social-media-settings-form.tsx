"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { updateSocialMediaSettingsAction } from "@/actions/settings";
import type { SiteSettings } from "@/lib/database/types";

export function SocialMediaSettingsForm({ settings }: { settings: SiteSettings }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  function handleSubmit(formData: FormData) {
    setError(null);
    setSaved(false);
    startTransition(async () => {
      const result = await updateSocialMediaSettingsAction(formData);
      if (!result.success) {
        setError(result.error);
        return;
      }
      setSaved(true);
      router.refresh();
    });
  }

  return (
    <form
      action={handleSubmit}
      className="max-w-2xl space-y-6 rounded-xl border border-slate-200 bg-white p-6 shadow-sm"
    >
      <div>
        <h2 className="text-lg font-semibold text-slate-900">Social media links</h2>
        <p className="mt-1 text-sm text-slate-500">
          These URLs appear as a fixed icon bar on the left of public pages and in the footer.
          Leave a field empty to hide that platform.
        </p>
      </div>

      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      {saved && (
        <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          Social media links saved.
        </p>
      )}

      <div className="grid gap-4">
        <label className="block text-sm">
          <span className="font-medium text-slate-700">Twitter / X</span>
          <input
            name="twitterUrl"
            type="url"
            placeholder="https://twitter.com/…"
            defaultValue={settings.social_twitter_url ?? ""}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
          />
        </label>
        <label className="block text-sm">
          <span className="font-medium text-slate-700">Facebook</span>
          <input
            name="facebookUrl"
            type="url"
            placeholder="https://facebook.com/…"
            defaultValue={settings.social_facebook_url ?? ""}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
          />
        </label>
        <label className="block text-sm">
          <span className="font-medium text-slate-700">YouTube</span>
          <input
            name="youtubeUrl"
            type="url"
            placeholder="https://youtube.com/…"
            defaultValue={settings.social_youtube_url ?? ""}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
          />
        </label>
        <label className="block text-sm">
          <span className="font-medium text-slate-700">Blogger</span>
          <input
            name="bloggerUrl"
            type="url"
            placeholder="https://….blogspot.com/…"
            defaultValue={settings.social_blogger_url ?? ""}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
          />
        </label>
        <label className="block text-sm">
          <span className="font-medium text-slate-700">Instagram</span>
          <input
            name="instagramUrl"
            type="url"
            placeholder="https://instagram.com/…"
            defaultValue={settings.social_instagram_url ?? ""}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
          />
        </label>
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="rounded-lg bg-ccshau-chrome-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-ccshau-chrome-800 disabled:opacity-60"
      >
        {isPending ? "Saving…" : "Save social links"}
      </button>
    </form>
  );
}
