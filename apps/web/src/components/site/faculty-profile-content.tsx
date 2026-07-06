import type { ReactNode } from "react";

import { CmsHtmlContent } from "@/components/site/cms-html-content";
import {
  isLegacyPlainFacultyProfile,
  isTableSection,
  parseKeyValueLines,
  parseLegacyFacultyProfile,
  splitTabularRows,
} from "@/lib/faculty/parse-legacy-profile";

const PROFILE_PROSE_CLASS =
  "faculty-profile-prose prose prose-slate max-w-none prose-headings:font-display prose-headings:text-emerald-900 prose-table:w-full prose-table:text-sm prose-th:bg-emerald-50 prose-th:px-3 prose-th:py-2 prose-td:border prose-td:border-slate-200 prose-td:px-3 prose-td:py-2";

function ProfileSectionCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="overflow-hidden rounded-lg border border-emerald-100 bg-white shadow-sm">
      <h3 className="border-b border-emerald-200 bg-emerald-50 px-4 py-2.5 font-display text-base font-bold text-emerald-900">
        {title}
      </h3>
      <div className="px-4 py-4">{children}</div>
    </section>
  );
}

function KeyValueGrid({ pairs }: { pairs: { key: string; value: string }[] }) {
  return (
    <dl className="grid gap-3 sm:grid-cols-2">
      {pairs.map((pair, index) => (
        <div key={`${pair.key}-${index}`} className={pair.key ? "" : "sm:col-span-2"}>
          {pair.key ? (
            <>
              <dt className="text-xs font-semibold uppercase tracking-wide text-emerald-800">{pair.key}</dt>
              <dd className="mt-0.5 text-sm text-slate-700">{pair.value}</dd>
            </>
          ) : (
            <p className="text-sm text-slate-700">{pair.value}</p>
          )}
        </div>
      ))}
    </dl>
  );
}

function ProfileTable({ rows }: { rows: string[][] }) {
  if (rows.length === 0) return null;
  const [header, ...body] = rows;
  const hasHeader = header.length > 1 && header.every((cell) => cell.length < 80);

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full border-collapse text-left text-sm">
        {hasHeader && (
          <thead>
            <tr className="bg-emerald-50 text-xs font-bold uppercase tracking-wide text-emerald-900">
              {header.map((cell) => (
                <th key={cell} className="border border-emerald-100 px-3 py-2">
                  {cell}
                </th>
              ))}
            </tr>
          </thead>
        )}
        <tbody>
          {(hasHeader ? body : rows).map((row, rowIndex) => (
            <tr key={rowIndex} className="text-slate-700 even:bg-slate-50/80">
              {row.map((cell, cellIndex) => (
                <td key={cellIndex} className="border border-slate-200 px-3 py-2 align-top">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function LegacyFacultyProfile({ content }: { content: string }) {
  const sections = parseLegacyFacultyProfile(content);

  if (sections.length === 0) {
    return (
      <CmsHtmlContent html={content} className={PROFILE_PROSE_CLASS} />
    );
  }

  return (
    <div className="space-y-4">
      {sections.map((section) => {
        const cleanLines = section.lines.map((l) => l.trim()).filter(Boolean);
        const isPersonal = /personal/i.test(section.title);
        const pairs = isPersonal ? parseKeyValueLines(section.lines) : [];
        const tableRows = isTableSection(section.lines) ? splitTabularRows(section.lines) : [];

        return (
          <ProfileSectionCard key={section.title} title={section.title}>
            {isPersonal && pairs.length > 0 ? (
              <KeyValueGrid pairs={pairs} />
            ) : tableRows.length > 0 ? (
              <ProfileTable rows={tableRows} />
            ) : (
              <ul className="space-y-2 text-sm leading-relaxed text-slate-700">
                {cleanLines.map((line, index) => (
                  <li key={index} className="border-b border-slate-100 pb-2 last:border-0 last:pb-0">
                    {line}
                  </li>
                ))}
              </ul>
            )}
          </ProfileSectionCard>
        );
      })}
    </div>
  );
}

export function FacultyProfileContent({
  html,
  className = "",
}: {
  html: string;
  className?: string;
}) {
  const trimmed = html.trim();
  if (!trimmed) return null;

  if (isLegacyPlainFacultyProfile(trimmed)) {
    return (
      <div className={className}>
        <LegacyFacultyProfile content={trimmed} />
      </div>
    );
  }

  return <CmsHtmlContent html={trimmed} className={`${PROFILE_PROSE_CLASS} ${className}`.trim()} />;
}
