"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, CalendarDays, ChevronLeft, ChevronRight, ExternalLink } from "lucide-react";

import { SiteFooter } from "@/components/design/shared/site-footer";
import { SiteHeader } from "@/components/design/shared/site-header";
import { useLanguage } from "@/components/design/shared/language-context";
import {
  calendarMonthLabel,
  daysInMonth,
  firstWeekdayOfMonth,
  formatEventDate,
  shiftCalendarMonth,
} from "@/lib/calendar/month";
import type { PublicCalendarEvent, PublicPageSummary } from "@/lib/data/public-types";
import { SELECTED_LAYOUT } from "@/lib/design/selected-layout";

const WEEKDAYS_EN = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const WEEKDAYS_HI = ["रवि", "सोम", "मंगल", "बुध", "गुरु", "शुक्र", "शनि"];

function groupEventsByDate(events: PublicCalendarEvent[]): Map<string, PublicCalendarEvent[]> {
  const map = new Map<string, PublicCalendarEvent[]>();
  for (const event of events) {
    const list = map.get(event.eventDate) ?? [];
    list.push(event);
    map.set(event.eventDate, list);
  }
  return map;
}

export function PublicEventsCalendar({
  year,
  month,
  monthEvents,
  upcomingEvents,
  portals,
}: {
  year: number;
  month: number;
  monthEvents: PublicCalendarEvent[];
  upcomingEvents: PublicCalendarEvent[];
  portals: PublicPageSummary[];
}) {
  const { lang, t } = useLanguage();
  const router = useRouter();
  const locale = lang === "hi" ? "hi-IN" : "en-IN";
  const weekdays = lang === "hi" ? WEEKDAYS_HI : WEEKDAYS_EN;

  const eventsByDate = groupEventsByDate(monthEvents);
  const totalDays = daysInMonth(year, month);
  const leadingBlanks = firstWeekdayOfMonth(year, month);
  const cells: (number | null)[] = [
    ...Array.from({ length: leadingBlanks }, () => null),
    ...Array.from({ length: totalDays }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  function goToMonth(nextYear: number, nextMonth: number) {
    router.push(`/events?year=${nextYear}&month=${nextMonth}`);
  }

  const prev = shiftCalendarMonth(year, month, -1);
  const next = shiftCalendarMonth(year, month, 1);

  return (
    <>
      <SiteHeader variant="future" />
      <main id="main-content" className="flex-1 bg-gradient-to-b from-emerald-50/50 to-white">
        <div className="gradient-hero pattern-dots px-4 py-14 text-white">
          <div className="mx-auto max-w-7xl">
            <Link
              href={SELECTED_LAYOUT.homePath}
              className="mb-4 inline-flex items-center gap-2 text-sm text-emerald-200 hover:text-white"
            >
              <ArrowLeft className="h-4 w-4" />
              {t("Back to home", "होम पर वापस")}
            </Link>
            <h1 className="font-display text-4xl font-bold">
              {t("Events Calendar", "कार्यक्रम कैलेंडर")}
            </h1>
            <p className="mt-2 max-w-2xl text-emerald-100">
              {t(
                "University events, melas, convocations and photo galleries — from the media centre and news.",
                "विश्वविद्यालय के कार्यक्रम, मेले और दीक्षांत — मीडिया केंद्र और समाचार से।",
              )}
            </p>
          </div>
        </div>

        <div className="mx-auto max-w-7xl px-4 py-10">
          <div className="grid gap-8 lg:grid-cols-[1.4fr_1fr]">
            <section className="rounded-2xl border border-emerald-100 bg-white p-6 shadow-sm">
              <div className="mb-6 flex items-center justify-between gap-4">
                <h2 className="font-display text-xl font-bold text-slate-900">
                  {calendarMonthLabel(year, month, locale)}
                </h2>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => goToMonth(prev.year, prev.month)}
                    className="rounded-lg border border-emerald-200 p-2 text-emerald-800 hover:bg-emerald-50"
                    aria-label={t("Previous month", "पिछला महीना")}
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => goToMonth(next.year, next.month)}
                    className="rounded-lg border border-emerald-200 p-2 text-emerald-800 hover:bg-emerald-50"
                    aria-label={t("Next month", "अगला महीना")}
                  >
                    <ChevronRight className="h-5 w-5" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-7 gap-1 text-center text-xs font-semibold uppercase tracking-wide text-slate-500">
                {weekdays.map((day) => (
                  <div key={day} className="py-2">
                    {day}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-1">
                {cells.map((day, index) => {
                  if (day === null) {
                    return <div key={`blank-${index}`} className="min-h-[5.5rem] rounded-lg bg-slate-50/50" />;
                  }

                  const dateKey = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                  const dayEvents = eventsByDate.get(dateKey) ?? [];
                  const isToday =
                    dateKey === new Date().toISOString().slice(0, 10);

                  return (
                    <div
                      key={dateKey}
                      className={`min-h-[5.5rem] rounded-lg border p-1.5 ${
                        isToday
                          ? "border-amber-300 bg-amber-50/60"
                          : dayEvents.length
                            ? "border-emerald-200 bg-emerald-50/40"
                            : "border-slate-100 bg-slate-50/30"
                      }`}
                    >
                      <p
                        className={`text-right text-xs font-bold ${
                          isToday ? "text-amber-700" : "text-slate-600"
                        }`}
                      >
                        {day}
                      </p>
                      <ul className="mt-1 space-y-0.5">
                        {dayEvents.slice(0, 2).map((event) => (
                          <li key={event.id}>
                            <Link
                              href={event.url}
                              className={`block truncate rounded px-1 py-0.5 text-[10px] font-medium text-emerald-900 hover:bg-emerald-100 ${lang === "hi" ? "font-hindi" : ""}`}
                              title={lang === "hi" ? (event.titleHi ?? event.titleEn) : event.titleEn}
                            >
                              {lang === "hi" ? (event.titleHi ?? event.titleEn) : event.titleEn}
                            </Link>
                          </li>
                        ))}
                        {dayEvents.length > 2 && (
                          <li className="px-1 text-[10px] text-slate-500">
                            +{dayEvents.length - 2} {t("more", "और")}
                          </li>
                        )}
                      </ul>
                    </div>
                  );
                })}
              </div>
            </section>

            <aside className="space-y-6">
              <section className="rounded-2xl border border-emerald-100 bg-white p-6 shadow-sm">
                <h2 className="flex items-center gap-2 font-display text-lg font-bold text-slate-900">
                  <CalendarDays className="h-5 w-5 text-emerald-700" />
                  {t("Upcoming events", "आगामी कार्यक्रम")}
                </h2>
                {upcomingEvents.length === 0 ? (
                  <p className="mt-4 text-sm text-slate-500">
                    {t("No upcoming events scheduled.", "कोई आगामी कार्यक्रम निर्धारित नहीं।")}
                  </p>
                ) : (
                  <ul className="mt-4 space-y-3">
                    {upcomingEvents.map((event) => (
                      <li key={`${event.source}-${event.id}`}>
                        <Link
                          href={event.url}
                          className="block rounded-xl border border-emerald-100 px-4 py-3 hover:bg-emerald-50"
                        >
                          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
                            {formatEventDate(event.eventDate, locale)}
                          </p>
                          <p className={`mt-1 font-semibold text-slate-900 ${lang === "hi" ? "font-hindi" : ""}`}>
                            {lang === "hi" ? (event.titleHi ?? event.titleEn) : event.titleEn}
                          </p>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              {portals.length > 0 && (
                <section className="rounded-2xl border border-amber-200 bg-amber-50/50 p-6 shadow-sm">
                  <h2 className="font-display text-lg font-bold text-slate-900">
                    {t("Event portals", "कार्यक्रम पोर्टल")}
                  </h2>
                  <p className="mt-1 text-sm text-slate-600">
                    {t(
                      "Temporary microsites for festivals, melas and conferences.",
                      "मेलों, उत्सवों और सम्मेलनों के लिए अस्थायी माइक्रोसाइट।",
                    )}
                  </p>
                  <ul className="mt-4 space-y-2">
                    {portals.map((portal) => (
                      <li key={portal.slug}>
                        <Link
                          href={`/portal/${portal.slug}`}
                          className="flex items-center justify-between rounded-xl bg-white px-4 py-3 font-semibold text-emerald-900 ring-1 ring-amber-200/80 hover:bg-amber-50"
                        >
                          <span className={lang === "hi" ? "font-hindi" : ""}>
                            {lang === "hi" ? (portal.titleHi ?? portal.titleEn) : portal.titleEn}
                          </span>
                          <ExternalLink className="h-4 w-4 shrink-0 text-amber-600" />
                        </Link>
                      </li>
                    ))}
                  </ul>
                </section>
              )}
            </aside>
          </div>
        </div>
      </main>
      <SiteFooter variant="future" />
    </>
  );
}
