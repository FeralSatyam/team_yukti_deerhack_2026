import { Loader2, ScanSearch } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/Chip";
import { SearchCombobox } from "@/components/ui/SearchCombobox";
import { searchMedications } from "@/lib/data/medications";

export function MedicationSection({
  medications,
  onAdd,
  onRemove,
  onAnalyze,
  isAnalyzing = false,
  disabled = false,
}) {
  const canAnalyze = medications.length >= 2 && !isAnalyzing;

  return (
    <section
      className="rounded-xl border border-[var(--border)] bg-white p-6 shadow-sm"
      aria-labelledby="medications-heading"
    >
      <div className="mb-4 flex items-baseline justify-between">
        <h2 id="medications-heading" className="text-lg font-semibold text-[var(--foreground)]">
          Medications
        </h2>
        <span className="text-sm text-[var(--muted)]">2+ required</span>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="flex-1">
          <SearchCombobox
            label="Search medication"
            placeholder="Search medication name..."
            options={medications}
            onSearch={searchMedications}
            onSelect={onAdd}
            disabled={disabled}
          />
        </div>
      </div>

      {medications.length > 0 && (
        <div className="mt-5">
          <p className="mb-2.5 text-sm font-medium text-[var(--muted)]">Selected</p>
          <div className="flex flex-wrap gap-2">
            {medications.map((med) => (
              <Chip key={med} label={med} onRemove={() => onRemove(med)} />
            ))}
          </div>
        </div>
      )}

      <div className="mt-5 flex flex-col gap-2 border-t border-[var(--border)] pt-5 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-[var(--muted)]" role="status">
          {medications.length < 2
            ? `Add ${2 - medications.length} more medication${
                2 - medications.length === 1 ? "" : "s"
              } to analyze`
            : `${medications.length} medications ready — press Analyze`}
        </p>
        <Button
          type="button"
          onClick={onAnalyze}
          disabled={!canAnalyze}
          className="w-full sm:w-auto"
        >
          {isAnalyzing ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <ScanSearch className="size-4" />
          )}
          {isAnalyzing ? "Analyzing…" : "Analyze interactions"}
        </Button>
      </div>
    </section>
  );
}
