"use client";

import { useEffect, useState } from "react";

type HealthResponse = {
  status: string;
  phase: string;
  environment: {
    supabase: string;
    schemaVersion?: string | null;
    supabaseProjectId?: string;
    supabaseError?: string | null;
    powerAutomate: string;
    analytics: string;
    missingEnvVars: string[];
  };
  stack: Record<string, string>;
};

const checklist = [
  "Project repository scaffolded (Next.js + Supabase)",
  "Phase 0 governance documents created",
  "Environment variable templates prepared",
  "Stakeholder workshop and content inventory (pending)",
  "RBAC matrix approval from CCSHAU (pending)",
  "Power Automate flow URLs from IT (pending)",
];

export function Phase0Status() {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/health")
      .then((res) => res.json())
      .then((data: HealthResponse) => setHealth(data))
      .catch(() => setError("Could not reach health endpoint"));
  }, []);

  return (
    <div className="flex flex-1 flex-col">
      <header className="border-b border-emerald-800/20 bg-emerald-900 text-white">
        <div className="mx-auto flex max-w-5xl flex-col gap-2 px-6 py-8">
          <p className="text-sm font-medium uppercase tracking-wider text-emerald-200">
            Phase 0 — Project Initiation
          </p>
          <h1 className="text-3xl font-semibold tracking-tight">
            CCSHAU Official Website
          </h1>
          <p className="max-w-2xl text-emerald-100">
            चौधरी चरण सिंह हरियाणा कृषि विश्वविद्यालय, हिसार — development
            environment scaffold
          </p>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-8 px-6 py-10">
        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold">Stack (Option B — finalized)</h2>
          <dl className="mt-4 grid gap-3 sm:grid-cols-2">
            {[
              ["Frontend", "Next.js on Vercel"],
              ["Database", "Supabase PostgreSQL"],
              ["Auth", "Supabase Auth"],
              ["Storage", "Supabase Storage"],
              ["Email", "Microsoft Power Automate"],
              ["Analytics", "On hold"],
            ].map(([label, value]) => (
              <div
                key={label}
                className="rounded-lg border border-slate-100 bg-slate-50 px-4 py-3"
              >
                <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  {label}
                </dt>
                <dd className="mt-1 font-medium text-slate-800">{value}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold">Environment status</h2>
          {error && (
            <p className="mt-3 text-sm text-red-600">{error}</p>
          )}
          {health && (
            <ul className="mt-4 space-y-2 text-sm">
              <li>
                <StatusBadge
                  ok={
                    health.environment.supabase === "configured" ||
                    health.environment.supabase === "connected"
                  }
                  label={`Supabase: ${health.environment.supabase}${
                    health.environment.schemaVersion
                      ? ` (schema ${health.environment.schemaVersion})`
                      : ""
                  }`}
                />
              </li>
              {health.environment.supabaseError && (
                <li className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">
                  {health.environment.supabaseError}
                </li>
              )}
              <li>
                <StatusBadge
                  ok={health.environment.powerAutomate === "configured"}
                  label={`Power Automate: ${health.environment.powerAutomate}`}
                />
              </li>
              <li>
                <StatusBadge ok label="Analytics: on hold (deferred)" />
              </li>
              {health.environment.missingEnvVars.length > 0 && (
                <li className="rounded-lg bg-amber-50 px-3 py-2 text-amber-900">
                  Missing env: {health.environment.missingEnvVars.join(", ")} —
                  copy <code className="text-xs">.env.example</code> to{" "}
                  <code className="text-xs">.env.local</code>
                </li>
              )}
            </ul>
          )}
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold">Phase 0 checklist</h2>
          <ul className="mt-4 space-y-2">
            {checklist.map((item) => (
              <li
                key={item}
                className="flex items-start gap-2 text-sm text-slate-700"
              >
                <span className="mt-0.5 text-emerald-600">•</span>
                {item}
              </li>
            ))}
          </ul>
          <p className="mt-4 text-sm text-slate-500">
            Governance documents: <code>docs/phase-0/</code>
          </p>
        </section>
      </main>

      <footer className="border-t border-slate-200 bg-white py-4 text-center text-xs text-slate-500">
        CCSHAU Website Project — Phase 0 — Not for production
      </footer>
    </div>
  );
}

function StatusBadge({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm ${
        ok
          ? "bg-emerald-50 text-emerald-800"
          : "bg-slate-100 text-slate-600"
      }`}
    >
      <span
        className={`h-2 w-2 rounded-full ${ok ? "bg-emerald-500" : "bg-slate-400"}`}
      />
      {label}
    </span>
  );
}
