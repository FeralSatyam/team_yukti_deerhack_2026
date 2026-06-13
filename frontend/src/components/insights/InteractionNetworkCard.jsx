import { InteractionNetwork } from "@/components/insights/InteractionNetwork";

const LEGEND = [
  { type: "node", color: "#86efac", ring: "#34d399", label: "Safe medicine" },
  { type: "node", color: "#bfdbfe", ring: "#93c5fd", label: "Neutral medicine" },
  { type: "edge", color: "#f59e0b", label: "Lower-harm interaction" },
  { type: "edge", color: "#ef4444", label: "Harmful interaction" },
];

function LegendSwatch({ item }) {
  if (item.type === "node") {
    return (
      <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden>
        <circle cx="8" cy="8" r="6" fill={item.color} stroke={item.ring} strokeWidth="1.5" />
      </svg>
    );
  }
  return (
    <svg width="22" height="8" viewBox="0 0 22 8" aria-hidden>
      <line x1="1" y1="4" x2="21" y2="4" stroke={item.color} strokeWidth="3.5" strokeLinecap="round" />
    </svg>
  );
}

// The relationship map: medications as nodes, detected interactions as colored
// edges, with the most severe pair anchored at the center.
export function InteractionNetworkCard({ medications, interactions }) {
  if (medications.length < 2) return null;

  return (
    <section className="rounded-xl border border-[var(--border)] bg-white p-5 shadow-sm sm:p-6">
      <div className="mb-3 flex items-baseline justify-between">
        <h3 className="text-sm font-semibold text-[var(--foreground)]">
          Interaction network
        </h3>
        <span className="text-xs text-[var(--muted)]">Relationship map</span>
      </div>

      <div className="rounded-lg border border-[var(--border)] bg-gradient-to-b from-[#fafdfd] to-[#f1f6f7] p-2">
        <InteractionNetwork medications={medications} interactions={interactions} />
      </div>

      <ul className="mt-4 flex flex-wrap gap-x-5 gap-y-2">
        {LEGEND.map((item) => (
          <li key={item.label} className="flex items-center gap-2 text-xs text-[var(--muted)]">
            <LegendSwatch item={item} />
            {item.label}
          </li>
        ))}
      </ul>
    </section>
  );
}
