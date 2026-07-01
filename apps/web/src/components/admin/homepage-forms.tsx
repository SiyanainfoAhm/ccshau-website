"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import {
  createHomepageDignitaryAction,
  createHomepageInitiativeAction,
  createHomepageQuoteAction,
  deleteHomepageDignitaryAction,
  deleteHomepageInitiativeAction,
  deleteHomepageQuoteAction,
  updateHomepageCtaAction,
  updateHomepageDignitaryAction,
  updateHomepageInitiativeAction,
  updateHomepageQuoteAction,
} from "@/actions/homepage";
import type {
  HomepageCta,
  HomepageDignitary,
  HomepageInitiative,
  HomepageQuote,
} from "@/lib/database/types";
import { getStoredFileUrl } from "@/lib/storage/upload";

function SortActiveFields({
  sortOrder,
  isActive,
}: {
  sortOrder?: number;
  isActive?: boolean;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <label className="block text-sm">
        <span className="font-medium text-slate-700">Sort order</span>
        <input
          name="sortOrder"
          type="number"
          min={0}
          defaultValue={sortOrder ?? 0}
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
        />
      </label>
      <label className="flex items-center gap-2 pt-7 text-sm text-slate-700">
        <input name="isActive" type="checkbox" defaultChecked={isActive ?? true} />
        Active on homepage
      </label>
    </div>
  );
}

function HomepageImageField({
  label,
  imagePath,
  required,
  urlPlaceholder = "https://...",
}: {
  label: string;
  imagePath?: string | null;
  required?: boolean;
  urlPlaceholder?: string;
}) {
  const [replaceImage, setReplaceImage] = useState(false);
  const previewUrl =
    imagePath && imagePath !== "pending" ? getStoredFileUrl(imagePath) : null;
  const showUpload = !previewUrl || replaceImage;

  return (
    <div className="space-y-3">
      <span className="text-sm font-medium text-slate-700">
        {label} {required && <span className="text-red-600">*</span>}
      </span>
      {previewUrl && !replaceImage && (
        <div className="relative h-48 w-40 overflow-hidden rounded-lg border border-slate-200">
          <Image src={previewUrl} alt="" fill className="object-cover object-top" />
        </div>
      )}
      {previewUrl && (
        <label className="flex items-center gap-2 text-sm text-slate-600">
          <input
            type="checkbox"
            checked={replaceImage}
            onChange={(e) => setReplaceImage(e.target.checked)}
          />
          Replace current photo
        </label>
      )}
      {replaceImage && <input type="hidden" name="removeImage" value="on" />}
      {showUpload && (
        <>
          <input
            name="image"
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="block w-full text-sm text-slate-600"
          />
          <p className="text-xs text-slate-500">Or paste an external image URL:</p>
          <input
            name="imagePath"
            type="url"
            defaultValue={
              replaceImage && imagePath?.startsWith("http") ? imagePath : ""
            }
            placeholder={urlPlaceholder}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
        </>
      )}
    </div>
  );
}

export function HomepageQuoteForm({ quote }: { quote?: HomepageQuote }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      if (quote) {
        const result = await updateHomepageQuoteAction(quote.id, formData);
        if (!result.success) {
          setError(result.error);
          return;
        }
      } else {
        const result = await createHomepageQuoteAction(formData);
        if (!result.success) {
          setError(result.error);
          return;
        }
        router.push(`/admin/homepage/quotes/${result.data.id}`);
      }
      router.refresh();
    });
  }

  return (
    <form action={handleSubmit} className="max-w-2xl space-y-5">
      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      <label className="block text-sm">
        <span className="font-medium text-slate-700">Author (English)</span>
        <input name="authorEn" required defaultValue={quote?.author_en ?? ""} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" />
      </label>
      <label className="block text-sm">
        <span className="font-medium text-slate-700">Author (Hindi)</span>
        <input name="authorHi" defaultValue={quote?.author_hi ?? ""} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-hindi" />
      </label>
      <label className="block text-sm">
        <span className="font-medium text-slate-700">Quote (English)</span>
        <textarea name="quoteEn" required rows={3} defaultValue={quote?.quote_en ?? ""} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" />
      </label>
      <label className="block text-sm">
        <span className="font-medium text-slate-700">Quote (Hindi)</span>
        <textarea name="quoteHi" rows={3} defaultValue={quote?.quote_hi ?? ""} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-hindi" />
      </label>
      <SortActiveFields sortOrder={quote?.sort_order} isActive={quote?.is_active} />
      <div className="flex gap-3">
        <button type="submit" disabled={isPending} className="rounded-lg bg-[#0b3d2e] px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60">
          {isPending ? "Saving…" : quote ? "Save quote" : "Create quote"}
        </button>
        <Link href="/admin/homepage/quotes" className="rounded-lg border border-slate-300 px-5 py-2.5 text-sm">
          Back
        </Link>
      </div>
    </form>
  );
}

export function HomepageDignitaryForm({ dignitary }: { dignitary?: HomepageDignitary }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      if (dignitary) {
        const result = await updateHomepageDignitaryAction(dignitary.id, formData);
        if (!result.success) {
          setError(result.error);
          return;
        }
      } else {
        const result = await createHomepageDignitaryAction(formData);
        if (!result.success) {
          setError(result.error);
          return;
        }
        router.push(`/admin/homepage/dignitaries/${result.data.id}`);
      }
      router.refresh();
    });
  }

  return (
    <form action={handleSubmit} className="max-w-2xl space-y-5">
      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      <label className="block text-sm">
        <span className="font-medium text-slate-700">Name (English)</span>
        <input name="nameEn" required defaultValue={dignitary?.name_en ?? ""} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" />
      </label>
      <label className="block text-sm">
        <span className="font-medium text-slate-700">Name (Hindi)</span>
        <input name="nameHi" defaultValue={dignitary?.name_hi ?? ""} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-hindi" />
      </label>
      <label className="block text-sm">
        <span className="font-medium text-slate-700">Role (English)</span>
        <input name="roleEn" required defaultValue={dignitary?.role_en ?? ""} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" />
      </label>
      <label className="block text-sm">
        <span className="font-medium text-slate-700">Role (Hindi)</span>
        <input name="roleHi" defaultValue={dignitary?.role_hi ?? ""} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-hindi" />
      </label>
      <HomepageImageField
        label="Photo"
        imagePath={dignitary?.image_path}
        required={!dignitary}
      />
      <SortActiveFields sortOrder={dignitary?.sort_order} isActive={dignitary?.is_active} />
      <div className="flex gap-3">
        <button type="submit" disabled={isPending} className="rounded-lg bg-[#0b3d2e] px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60">
          {isPending ? "Saving…" : dignitary ? "Save dignitary" : "Create dignitary"}
        </button>
        <Link href="/admin/homepage/dignitaries" className="rounded-lg border border-slate-300 px-5 py-2.5 text-sm">
          Back
        </Link>
      </div>
    </form>
  );
}

export function HomepageInitiativeForm({ initiative }: { initiative?: HomepageInitiative }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      if (initiative) {
        const result = await updateHomepageInitiativeAction(initiative.id, formData);
        if (!result.success) {
          setError(result.error);
          return;
        }
      } else {
        const result = await createHomepageInitiativeAction(formData);
        if (!result.success) {
          setError(result.error);
          return;
        }
        router.push(`/admin/homepage/flagships/${result.data.id}`);
      }
      router.refresh();
    });
  }

  return (
    <form action={handleSubmit} className="max-w-2xl space-y-5">
      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      <label className="block text-sm">
        <span className="font-medium text-slate-700">Title (English)</span>
        <input name="titleEn" required defaultValue={initiative?.title_en ?? ""} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" />
      </label>
      <label className="block text-sm">
        <span className="font-medium text-slate-700">Title (Hindi)</span>
        <input name="titleHi" defaultValue={initiative?.title_hi ?? ""} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-hindi" />
      </label>
      <label className="block text-sm">
        <span className="font-medium text-slate-700">Description (English)</span>
        <textarea name="descriptionEn" required rows={4} defaultValue={initiative?.description_en ?? ""} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" />
      </label>
      <label className="block text-sm">
        <span className="font-medium text-slate-700">Description (Hindi)</span>
        <textarea name="descriptionHi" rows={4} defaultValue={initiative?.description_hi ?? ""} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-hindi" />
      </label>
      <HomepageImageField
        label="Banner image"
        imagePath={initiative?.image_path}
        required={!initiative}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="font-medium text-slate-700">College slug (optional)</span>
          <input name="linkSlug" defaultValue={initiative?.link_slug ?? ""} placeholder="agribusiness-incubation-centre" className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" />
        </label>
        <label className="block text-sm">
          <span className="font-medium text-slate-700">Link URL (optional override)</span>
          <input name="linkHref" defaultValue={initiative?.link_href ?? ""} placeholder="/college/..." className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" />
        </label>
      </div>
      <SortActiveFields sortOrder={initiative?.sort_order} isActive={initiative?.is_active} />
      <div className="flex gap-3">
        <button type="submit" disabled={isPending} className="rounded-lg bg-[#0b3d2e] px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60">
          {isPending ? "Saving…" : initiative ? "Save flagship" : "Create flagship"}
        </button>
        <Link href="/admin/homepage/flagships" className="rounded-lg border border-slate-300 px-5 py-2.5 text-sm">
          Back
        </Link>
      </div>
    </form>
  );
}

export function HomepageCtaForm({ cta }: { cta?: HomepageCta | null }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await updateHomepageCtaAction(formData);
      if (!result.success) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <form action={handleSubmit} className="max-w-2xl space-y-5">
      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      <label className="block text-sm">
        <span className="font-medium text-slate-700">Title (English)</span>
        <input name="titleEn" required defaultValue={cta?.title_en ?? "Farmers' Portal"} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" />
      </label>
      <label className="block text-sm">
        <span className="font-medium text-slate-700">Title (Hindi)</span>
        <input name="titleHi" defaultValue={cta?.title_hi ?? ""} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-hindi" />
      </label>
      <label className="block text-sm">
        <span className="font-medium text-slate-700">Subtitle (English)</span>
        <textarea name="subtitleEn" rows={2} defaultValue={cta?.subtitle_en ?? ""} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" />
      </label>
      <label className="block text-sm">
        <span className="font-medium text-slate-700">Subtitle (Hindi)</span>
        <textarea name="subtitleHi" rows={2} defaultValue={cta?.subtitle_hi ?? ""} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-hindi" />
      </label>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="font-medium text-slate-700">Button (English)</span>
          <input name="buttonEn" required defaultValue={cta?.button_en ?? "Click Here"} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" />
        </label>
        <label className="block text-sm">
          <span className="font-medium text-slate-700">Button (Hindi)</span>
          <input name="buttonHi" defaultValue={cta?.button_hi ?? ""} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 font-hindi" />
        </label>
      </div>
      <label className="block text-sm">
        <span className="font-medium text-slate-700">Link URL</span>
        <input name="linkHref" required defaultValue={cta?.link_href ?? "/pages/about"} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" />
      </label>
      <label className="flex items-center gap-2 text-sm text-slate-700">
        <input name="isActive" type="checkbox" defaultChecked={cta?.is_active ?? true} />
        Show farmers portal band on homepage
      </label>
      <div className="flex gap-3">
        <button type="submit" disabled={isPending} className="rounded-lg bg-[#0b3d2e] px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-60">
          {isPending ? "Saving…" : "Save CTA"}
        </button>
        <Link href="/admin/homepage" className="rounded-lg border border-slate-300 px-5 py-2.5 text-sm">
          Back
        </Link>
      </div>
    </form>
  );
}

export function DeleteHomepageQuoteButton({ id }: { id: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  return (
    <button
      type="button"
      disabled={isPending}
      onClick={() =>
        startTransition(async () => {
          if (!confirm("Delete this quote?")) return;
          await deleteHomepageQuoteAction(id);
          router.push("/admin/homepage/quotes");
          router.refresh();
        })
      }
      className="text-sm text-red-600 hover:underline disabled:opacity-60"
    >
      Delete
    </button>
  );
}

export function DeleteHomepageDignitaryButton({ id }: { id: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  return (
    <button
      type="button"
      disabled={isPending}
      onClick={() =>
        startTransition(async () => {
          if (!confirm("Delete this dignitary?")) return;
          await deleteHomepageDignitaryAction(id);
          router.push("/admin/homepage/dignitaries");
          router.refresh();
        })
      }
      className="text-sm text-red-600 hover:underline disabled:opacity-60"
    >
      Delete
    </button>
  );
}

export function DeleteHomepageInitiativeButton({ id }: { id: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  return (
    <button
      type="button"
      disabled={isPending}
      onClick={() =>
        startTransition(async () => {
          if (!confirm("Delete this flagship?")) return;
          await deleteHomepageInitiativeAction(id);
          router.push("/admin/homepage/flagships");
          router.refresh();
        })
      }
      className="text-sm text-red-600 hover:underline disabled:opacity-60"
    >
      Delete
    </button>
  );
}
