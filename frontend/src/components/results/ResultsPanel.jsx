import { AlertTriangle, Loader2, ShieldAlert, ShieldCheck } from "lucide-react";

import { InteractionNetworkCard } from "@/components/insights/InteractionNetworkCard";
import { titleCase } from "@/lib/text";
import { cn } from "@/lib/utils";

const OVERALL = {
  high: {
    Icon: ShieldAlert,
    title: "Major interaction detected",
    wrap: "border-red-200 bg-red-50",
    icon: "bg-red-100 text-red-600",
    text: "text-red-700",
  },
  moderate: {
    Icon: AlertTriangle,
    title: "Moderate interaction detected",
    wrap: "border-amber-200 bg-amber-50",
    icon: "bg-amber-100 text-amber-600",
    text: "text-amber-700",
  },
  safe: {
    Icon: ShieldCheck,
    title: "No major interactions found",
    wrap: "border-emerald-200 bg-emerald-50",
    icon: "bg-emerald-100 text-emerald-600",
    text: "text-emerald-700",
  },
};

const SEVERITY = {
  critical: { dot: "bg-red-600", badge: "bg-red-100 text-red-800", label: "Critical" },
  high:     { dot: "bg-red-500", badge: "bg-red-50 text-red-700",   label: "Major" },
  moderate: { dot: "bg-amber-500", badge: "bg-amber-50 text-amber-700", label: "Moderate" },
  low:      { dot: "bg-emerald-500", badge: "bg-emerald-50 text-emerald-700", label: "Minor" },
};


function overallFromInteractions(interactions) {
  let level = "safe";
  for (const ix of interactions) {
    if (ix.severity === "critical" || ix.severity === "high") return "high";
    if (ix.severity === "moderate") level = "moderate";
  }
  return level;
}

export function ResultsPanel({ medications, preview, isAnalyzing }) {
  if (isAnalyzing) {
    return (
      <section className="flex flex-col items-center rounded-xl border border-[var(--border)] bg-white py-14 text-center shadow-sm">
        <Loader2 className="mb-3 size-7 animate-spin text-primary" />
        <p className="text-sm text-[var(--muted)]">
          Analyzing medication combination…
        </p>
      </section>
    );
  }

  if (!preview) return null;

  const overall = overallFromInteractions(preview.interactions);
  const cfg = OVERALL[overall];
  const details = preview.insights.filter((i) => i.medications.length >= 2);

  return (
    <div className="space-y-5">
      {/* Relationship map — shown first, directly under the medications card */}
      <InteractionNetworkCard
        medications={medications}
        interactions={preview.interactions}
      />

      {/* Overall verdict */}
      <section className="rounded-xl border border-[var(--border)] bg-white p-5 shadow-sm sm:p-6">
        <div className={cn("flex items-center gap-3 rounded-lg border p-3.5", cfg.wrap)}>
          <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-lg", cfg.icon)}>
            <cfg.Icon className="size-5" />
          </span>
          <div className="min-w-0">
            <p className={cn("text-sm font-semibold", cfg.text)}>{cfg.title}</p>
            <p className="text-xs text-[var(--muted)]">
              {medications.length} medications checked · confidence {preview.confidence}%
            </p>
          </div>
        </div>

        <div className="mt-4 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
          <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
          For clinical awareness only — not a substitute for professional
          judgment.
        </div>

        {/* Interaction breakdown */}
        {details.length > 0 ? (
          <ul className="mt-4 space-y-3">
            {details.map((ix) => {
              const sev = SEVERITY[ix.severity] ?? SEVERITY.low;
              return (
                <li key={ix.id} className="rounded-lg border border-[var(--border)] p-3.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="flex items-center gap-2 text-sm font-medium text-[var(--foreground)]">
                      <span className={cn("size-2 rounded-full", sev.dot)} />
                      {ix.medications.join(" + ")}
                    </span>
                    <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-medium", sev.badge)}>
                      {sev.label}
                    </span>
                  </div>
                  <p className="mt-2 text-sm leading-relaxed text-[var(--text2,#374151)]">
                    {ix.detailedExplanation}
                  </p>
                  {ix.symptoms?.length > 0 && (
                    <div className="mt-2.5 flex flex-wrap gap-1.5">
                      {ix.symptoms.map((s) => (
                        <span
                          key={s}
                          className="rounded-full bg-gray-100 px-2.5 py-0.5 text-[11px] font-medium text-[var(--foreground)]"
                        >
                          {titleCase(s)}
                        </span>
                      ))}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="mt-4 rounded-lg border border-[var(--border)] py-6 text-center text-sm text-[var(--muted)]">
            All {medications.length} medications checked — no interactions found.
          </p>
        )}
      </section>
    </div>
  );
}
