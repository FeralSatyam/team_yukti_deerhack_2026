// Static catalog of common patient symptoms used to power the symptom search
// combobox and the "Common" quick-pick chips. Searched with a case-insensitive
// substring match, ranked so prefix hits come first.

export const COMMON_SYMPTOMS = [
  "Dizziness",
  "Nausea",
  "Headache",
  "Fatigue",
  "Drowsiness",
  "Dry mouth",
  "Constipation",
  "Diarrhea",
  "Vomiting",
  "Abdominal pain",
  "Rash",
  "Itching",
  "Shortness of breath",
  "Chest pain",
  "Palpitations",
  "Swelling",
  "Muscle pain",
  "Joint pain",
  "Blurred vision",
  "Confusion",
  "Insomnia",
  "Anxiety",
  "Depressed mood",
  "Loss of appetite",
  "Weight gain",
  "Increased thirst",
  "Frequent urination",
  "Fever",
  "Chills",
  "Sweating",
  "Tremor",
  "Numbness",
  "Tingling",
  "Cough",
  "Sore throat",
  "Low blood pressure",
  "High blood pressure",
  "Slow heart rate",
  "Fast heart rate",
  "Bleeding or bruising",
];

/**
 * Case-insensitive search over the symptom catalog. Prefix matches are ranked
 * above mid-string matches so the most likely option surfaces first.
 */
export function searchSymptoms(query) {
  const q = query.trim().toLowerCase();
  if (!q) return COMMON_SYMPTOMS;

  const matches = COMMON_SYMPTOMS.filter((name) =>
    name.toLowerCase().includes(q),
  );

  return matches.sort((a, b) => {
    const aPrefix = a.toLowerCase().startsWith(q) ? 0 : 1;
    const bPrefix = b.toLowerCase().startsWith(q) ? 0 : 1;
    if (aPrefix !== bPrefix) return aPrefix - bPrefix;
    return a.localeCompare(b);
  });
}
