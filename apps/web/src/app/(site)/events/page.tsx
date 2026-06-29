import {
  getCalendarEventsForMonth,
  getPublishedChildPagesByParentSlug,
  getUpcomingCalendarEvents,
  EVENT_PORTALS_PARENT_SLUG,
} from "@/lib/data/public";
import { parseCalendarMonth } from "@/lib/calendar/month";
import { PublicEventsCalendar } from "@/components/site/public-events-calendar";

export const metadata = {
  title: "Events Calendar",
  description: "University events, melas, convocations and programmes at CCSHAU Hisar",
};

export default async function EventsPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string; month?: string }>;
}) {
  const { year: yearParam, month: monthParam } = await searchParams;
  const { year, month } = parseCalendarMonth(yearParam, monthParam);

  const [monthEvents, upcomingEvents, portals] = await Promise.all([
    getCalendarEventsForMonth(year, month),
    getUpcomingCalendarEvents(8),
    getPublishedChildPagesByParentSlug(EVENT_PORTALS_PARENT_SLUG),
  ]);

  return (
    <PublicEventsCalendar
      year={year}
      month={month}
      monthEvents={monthEvents}
      upcomingEvents={upcomingEvents}
      portals={portals}
    />
  );
}
