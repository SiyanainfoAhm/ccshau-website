"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { ArrowLeft, Mail, MapPin, Phone, Send } from "lucide-react";

import { submitPublicFeedbackAction } from "@/actions/public/feedback";
import { SiteFooter } from "@/components/design/shared/site-footer";
import { SiteHeader } from "@/components/design/shared/site-header";
import {
  getRecaptchaToken,
  RecaptchaWidget,
  resetRecaptcha,
} from "@/components/shared/recaptcha-widget";
import type { CaptchaClientConfig } from "@/lib/auth/captcha";
import { FEEDBACK_CATEGORIES } from "@/lib/validations/feedback";
import { university } from "@/lib/mock/site-content";
import { SELECTED_LAYOUT } from "@/lib/design/selected-layout";

const offices = [
  { name: "Registrar Office", phone: "01662-255200", email: "registrar@hau.ac.in" },
  { name: "Computer Section", phone: "01662-255201", email: "computer@hau.ac.in" },
  { name: "Public Relations", phone: "01662-255202", email: "pro@hau.ac.in" },
];

export function PublicContactPage({
  departments,
  captcha,
}: {
  departments: { id: string; name_en: string }[];
  captcha: CaptchaClientConfig;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [ticketNumber, setTicketNumber] = useState<string | null>(null);

  function handleSubmit(formData: FormData) {
    setError(null);
    if (captcha.required) {
      const token = getRecaptchaToken();
      if (!token) {
        setError("Please complete the CAPTCHA.");
        return;
      }
      formData.set("captchaToken", token);
    }
    startTransition(async () => {
      const result = await submitPublicFeedbackAction(formData);
      if (!result.success) {
        setError(result.error);
        if (captcha.required) resetRecaptcha();
        return;
      }
      setTicketNumber(result.data.ticketNumber);
    });
  }

  return (
    <>
      <SiteHeader variant="future" />
      <main id="main-content" className="flex-1">
        <div className="gradient-hero pattern-dots px-4 py-14 text-white">
          <div className="mx-auto max-w-7xl">
            <Link
              href={SELECTED_LAYOUT.homePath}
              className="mb-4 inline-flex items-center gap-2 text-sm text-emerald-200 hover:text-white"
            >
              <ArrowLeft className="h-4 w-4" /> Back to home
            </Link>
            <h1 className="font-display text-4xl font-bold">Contact Us</h1>
            <p className="mt-2 font-hindi text-emerald-100">संपर्क करें</p>
          </div>
        </div>

        <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 lg:grid-cols-2">
          <div>
            <h2 className="font-display text-2xl font-bold text-slate-900">Get in Touch</h2>
            <div className="mt-6 space-y-4">
              {offices.map((o) => (
                <div
                  key={o.name}
                  className="rounded-2xl border border-emerald-100 bg-white p-5 shadow-sm"
                >
                  <h3 className="font-semibold text-emerald-900">{o.name}</h3>
                  <p className="mt-2 flex items-center gap-2 text-sm text-slate-600">
                    <Phone className="h-4 w-4 text-emerald-600" /> {o.phone}
                  </p>
                  <p className="mt-1 flex items-center gap-2 text-sm text-slate-600">
                    <Mail className="h-4 w-4 text-emerald-600" /> {o.email}
                  </p>
                </div>
              ))}
            </div>
            <div className="mt-6 flex items-start gap-3 rounded-2xl bg-emerald-50 p-5">
              <MapPin className="mt-1 h-5 w-5 text-emerald-700" />
              <div>
                <p className="font-semibold text-emerald-900">{university.nameEn}</p>
                <p className="text-sm text-slate-600">{university.location}</p>
                <p className="mt-1 text-sm font-medium text-emerald-700">{university.phone}</p>
              </div>
            </div>
          </div>

          {ticketNumber ? (
            <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-8 text-center">
              <h2 className="font-display text-2xl font-bold text-emerald-900">Thank you</h2>
              <p className="mt-3 text-slate-600">Your feedback has been submitted.</p>
              <p className="mt-4 font-mono text-lg font-bold text-[#0b3d2e]">{ticketNumber}</p>
              <p className="mt-2 text-sm text-slate-500">Save this ticket number for follow-up.</p>
            </div>
          ) : (
            <form action={handleSubmit} className="rounded-3xl border border-emerald-100 bg-white p-8 shadow-xl">
              <h2 className="font-display text-2xl font-bold text-slate-900">Send Feedback</h2>
              <p className="mt-1 text-sm text-slate-500">Department-wise enquiry form</p>
              {error && (
                <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
              )}
              <div className="mt-6 space-y-4">
                <input
                  name="submitterName"
                  type="text"
                  required
                  placeholder="Your name"
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
                />
                <input
                  name="email"
                  type="email"
                  required
                  placeholder="Email address"
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
                />
                <input
                  name="phone"
                  type="tel"
                  placeholder="Phone (optional)"
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-emerald-500"
                />
                <select name="category" className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-emerald-500">
                  <option value="">Category (optional)</option>
                  {FEEDBACK_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat.replace(/_/g, " ")}
                    </option>
                  ))}
                </select>
                <select name="departmentId" className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-emerald-500">
                  <option value="">Select department (optional)</option>
                  {departments.map((dept) => (
                    <option key={dept.id} value={dept.id}>
                      {dept.name_en}
                    </option>
                  ))}
                </select>
                <input
                  name="subject"
                  type="text"
                  required
                  placeholder="Subject"
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
                />
                <textarea
                  name="message"
                  rows={4}
                  required
                  placeholder="Your message"
                  className="w-full rounded-xl border border-slate-200 px-4 py-3 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
                />
                {captcha.required && captcha.siteKey && (
                  <RecaptchaWidget siteKey={captcha.siteKey} />
                )}
                <button
                  type="submit"
                  disabled={isPending}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-2xl gradient-gold py-4 font-bold text-emerald-950 shadow-lg transition hover:scale-[1.02] disabled:opacity-50"
                >
                  <Send className="h-5 w-5" /> {isPending ? "Submitting…" : "Submit Feedback"}
                </button>
              </div>
            </form>
          )}
        </div>
      </main>
      <SiteFooter variant="future" />
    </>
  );
}
