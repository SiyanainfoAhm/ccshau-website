"use client";

import type { PageLayoutConfig } from "@/lib/pages/layout-config";
import { LAYOUT_CONFIG_KEYS, LAYOUT_SECTION_LABELS } from "@/lib/pages/layout-config";

export function LayoutConfigAdminPanel({
  layoutConfig,
  onChange,
  hiddenKeys = [],
  readOnly = false,
}: {
  layoutConfig: PageLayoutConfig;
  onChange: (next: PageLayoutConfig) => void;
  hiddenKeys?: (keyof PageLayoutConfig)[];
  readOnly?: boolean;
}) {
  function toggle(key: keyof PageLayoutConfig) {
    if (readOnly) return;
    onChange({ ...layoutConfig, [key]: !layoutConfig[key] });
  }

  const visibleKeys = LAYOUT_CONFIG_KEYS.filter((key) => !hiddenKeys.includes(key));

  return (
    <div className="rounded-xl border border-violet-200 bg-violet-50/40 p-6 shadow-sm">
      <h2 className="mb-1 text-lg font-semibold text-slate-900">Layout sections</h2>
      <p className="mb-4 text-sm text-slate-600">
        {readOnly
          ? "These sections are shown for reference. View-only users cannot change layout settings."
          : "Toggle which blocks appear on the public page. Changing the layout template above resets these to a preset — you can adjust them afterward. Click Update page to apply changes on the live site."}
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        {visibleKeys.map((key) => {
          const label = LAYOUT_SECTION_LABELS[key];
          return (
            <label
              key={key}
              className={`flex items-start gap-3 rounded-lg border border-violet-100 bg-white p-3 shadow-sm ${
                readOnly ? "cursor-default opacity-80" : "cursor-pointer transition hover:border-violet-200"
              }`}
            >
              <input
                type="checkbox"
                checked={layoutConfig[key]}
                onChange={() => toggle(key)}
                disabled={readOnly}
                className="mt-1"
              />
              <span className="text-sm">
                <span className="font-medium text-slate-900">{label.en}</span>
                <span className="mt-0.5 block text-xs text-slate-500">{label.description}</span>
              </span>
            </label>
          );
        })}
      </div>
    </div>
  );
}
