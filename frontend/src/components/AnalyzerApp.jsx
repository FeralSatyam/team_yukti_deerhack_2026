import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ScanSearch, UserPlus } from "lucide-react";
import { toast } from "sonner";

import { Header } from "@/components/Header";
import { MedicationSection } from "@/components/MedicationSection";
import { PatientHistoryPanel } from "@/components/PatientHistoryPanel";
import { ResultsPanel } from "@/components/results/ResultsPanel";
import { usePatients } from "@/context/PatientContext";
import { buildPreviewAnalysis, getPrimaryInsight } from "@/lib/analysis/insights";
import { resolveMedicinePair } from "@/lib/resolveMedicinePair";
import { severityToRisk } from "@/lib/risk";

export function AnalyzerApp() {
  const {
    currentPatient,
    currentPatientId,
    medications,
    setMedications,
    persistMedications,
    saveAnalysis,
  } = usePatients();

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  // The committed analysis result — only set when Analyze is pressed.
  const [analysis, setAnalysis] = useState(null);
  const [previewKey, setPreviewKey] = useState(0);
  // Avoids re-recording history when re-analyzing the same medication set.
  const lastSavedSignature = useRef(null);

  const signature = useMemo(
    () => [...medications].sort().join("|"),
    [medications]
  );

  const reportData = useMemo(() => {
    if (!analysis) return null;
    const { preview, primaryInsight, medications: meds } = analysis;
    const [medicineA, medicineB] = resolveMedicinePair(primaryInsight, meds);
    return { medications: meds, insight: primaryInsight, preview, medicineA, medicineB };
  }, [analysis]);

  const isReportReady = !!analysis && !isAnalyzing;

  // Clear stale results whenever the medication set or patient changes, so the
  // doctor always re-runs Analyze against the current list.
  useEffect(() => {
    setAnalysis(null);
    setIsAnalyzing(false);
  }, [signature, currentPatientId]);

  const runAnalysis = useCallback(() => {
    if (medications.length < 2 || isAnalyzing) return;

    setIsAnalyzing(true);
    // Brief pause so the analyzing state is visible; this is also the single
    // place a real /api/predict call would be issued.
    const snapshot = [...medications];
    setTimeout(() => {
      const preview = buildPreviewAnalysis(snapshot);
      const primaryInsight = getPrimaryInsight(preview, snapshot);
      setAnalysis({ preview, primaryInsight, medications: snapshot });
      setPreviewKey((k) => k + 1);
      setIsAnalyzing(false);

      // Record the run once per distinct medication set (server call).
      const sig = [...snapshot].sort().join("|");
      if (primaryInsight && sig !== lastSavedSignature.current) {
        lastSavedSignature.current = sig;
        saveAnalysis({
          medications: snapshot,
          riskLevel: severityToRisk(primaryInsight.severity),
          result: {
            headline: primaryInsight.headline,
            severity: primaryInsight.severity,
            likelihood: primaryInsight.likelihood,
            symptoms: primaryInsight.symptoms,
          },
        });
      }
    }, 600);
  }, [medications, isAnalyzing, saveAnalysis]);

  const addMedication = useCallback(
    (med) => {
      if (!currentPatientId) {
        toast.error("Select or add a patient first");
        return;
      }
      if (medications.includes(med)) return;
      const next = [...medications, med];
      setMedications(next);
      persistMedications(next);
    },
    [medications, currentPatientId, setMedications, persistMedications]
  );

  const removeMedication = useCallback(
    (med) => {
      const next = medications.filter((m) => m !== med);
      setMedications(next);
      persistMedications(next);
    },
    [medications, setMedications, persistMedications]
  );

  return (
    <>
      <Header reportData={reportData} isReportReady={isReportReady} />
      <main className="mx-auto max-w-3xl flex-1 px-4 py-8 sm:px-6 sm:py-10">
        {!currentPatient ? (
          <div className="rounded-xl border border-dashed border-[var(--border)] bg-white px-6 py-16 text-center">
            <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-xl border border-dashed border-[var(--border)]">
              <UserPlus className="size-6 text-[var(--muted)]" />
            </div>
            <p className="text-sm font-medium text-[var(--foreground)]">
              Select a patient to begin
            </p>
            <p className="mt-1 text-sm text-[var(--muted)]">
              Use the patient menu in the top bar to pick or add a patient.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            <MedicationSection
              medications={medications}
              onAdd={addMedication}
              onRemove={removeMedication}
              onAnalyze={runAnalysis}
              isAnalyzing={isAnalyzing}
            />

            {isAnalyzing && (
              <ResultsPanel medications={medications} preview={null} isAnalyzing />
            )}

            {!isAnalyzing && analysis && (
              <ResultsPanel
                key={previewKey}
                medications={analysis.medications}
                preview={analysis.preview}
                isAnalyzing={false}
              />
            )}

            {!isAnalyzing && !analysis && (
              <div className="rounded-xl border border-dashed border-[var(--border)] bg-white px-6 py-12 text-center">
                {medications.length < 2 ? (
                  <p className="text-sm font-medium text-[var(--muted)]">
                    Add at least 2 medications to see how their combination may
                    affect {currentPatient.name.split(" ")[0]}
                  </p>
                ) : (
                  <p className="flex items-center justify-center gap-2 text-sm font-medium text-[var(--muted)]">
                    <ScanSearch className="size-4" />
                    Press Analyze to check interactions for{" "}
                    {currentPatient.name.split(" ")[0]}
                  </p>
                )}
              </div>
            )}

            <PatientHistoryPanel />
          </div>
        )}
      </main>
    </>
  );
}
