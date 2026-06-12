const DRUG_SIDE_EFFECTS = {
  Metformin: ["Nausea", "Vomiting", "Diarrhea", "Abdominal Pain", "Fatigue"],
  Ondansetron: ["Headache", "Constipation", "Dizziness", "Fatigue"],
  Amoxicillin: ["Nausea", "Vomiting", "Diarrhea", "Rash", "Headache"],
  Lisinopril: ["Dizziness", "Cough", "Headache", "Fatigue"],
  Atorvastatin: ["Muscle Pain", "Headache", "Nausea", "Fatigue"],
  Omeprazole: ["Headache", "Nausea", "Diarrhea", "Abdominal Pain"],
  Ibuprofen: ["Nausea", "Abdominal Pain", "Dizziness", "Rash"],
  Warfarin: ["Nausea", "Rash", "Muscle Pain"],
  Tramadol: ["Nausea", "Vomiting", "Dizziness", "Constipation"],
  Sertraline: ["Nausea", "Diarrhea", "Insomnia", "Dizziness", "Headache", "Anxiety"],
  Prednisone: ["Insomnia", "Confusion", "Muscle Pain", "Swelling"],
  Morphine: ["Nausea", "Vomiting", "Constipation", "Dizziness"],
  Codeine: ["Nausea", "Vomiting", "Constipation", "Dizziness"],
  Furosemide: ["Dizziness", "Muscle Pain", "Confusion"],
  Amlodipine: ["Dizziness", "Swelling", "Palpitations", "Headache"],
  Metoprolol: ["Fatigue", "Dizziness", "Shortness of Breath"],
  Ciprofloxacin: ["Nausea", "Diarrhea", "Dizziness", "Headache"],
  Azithromycin: ["Nausea", "Vomiting", "Diarrhea", "Abdominal Pain"],
};

const DRUG_INTERACTIONS = {
  Metformin: {
    Ondansetron: {
      severity: "moderate",
      symptoms: ["Nausea", "Vomiting", "Abdominal Pain"],
    },
    Ibuprofen: {
      severity: "moderate",
      symptoms: ["Nausea", "Abdominal Pain"],
    },
  },
  Ondansetron: {
    Metformin: {
      severity: "moderate",
      symptoms: ["Nausea", "Vomiting", "Abdominal Pain"],
    },
    Tramadol: {
      severity: "high",
      symptoms: ["Headache", "Dizziness", "Confusion"],
    },
  },
  Warfarin: {
    Ibuprofen: {
      severity: "critical",
      symptoms: ["Swelling", "Abdominal Pain", "Chest Pain"],
    },
    Amoxicillin: {
      severity: "moderate",
      symptoms: ["Rash", "Nausea"],
    },
  },
  Ibuprofen: {
    Warfarin: {
      severity: "critical",
      symptoms: ["Swelling", "Abdominal Pain", "Chest Pain"],
    },
    Metformin: {
      severity: "moderate",
      symptoms: ["Nausea", "Abdominal Pain"],
    },
  },
  Sertraline: {
    Tramadol: {
      severity: "high",
      symptoms: ["Confusion", "Dizziness", "Nausea"],
    },
    Codeine: {
      severity: "high",
      symptoms: ["Confusion", "Dizziness", "Nausea"],
    },
  },
  Morphine: {
    Ondansetron: {
      severity: "moderate",
      symptoms: ["Constipation", "Nausea"],
    },
  },
};

function normalizeSymptom(s) {
  return s.toLowerCase().trim();
}

function symptomMatch(reported, known) {
  if (reported.length === 0 || known.length === 0) return 0;
  const reportedNorm = reported.map(normalizeSymptom);
  const matches = known.filter((k) =>
    reportedNorm.some(
      (r) => r === normalizeSymptom(k) || r.includes(normalizeSymptom(k)) || normalizeSymptom(k).includes(r)
    )
  );
  return matches.length / reported.length;
}

function getDrugLikelihood(med, symptoms) {
  const sideEffects = DRUG_SIDE_EFFECTS[med] ?? [];
  const match = symptomMatch(symptoms, sideEffects);
  const base = sideEffects.length > 0 ? 0.35 + match * 0.55 : 0.15 + match * 0.2;
  return Math.min(0.95, Math.round(base * 100));
}

function getCombinationLikelihood(meds, symptoms) {
  const [a, b] = meds;
  const interaction = DRUG_INTERACTIONS[a]?.[b] ?? DRUG_INTERACTIONS[b]?.[a];
  if (!interaction) {
    const avg =
      (getDrugLikelihood(a, symptoms) + getDrugLikelihood(b, symptoms)) / 2;
    return Math.round(avg * 0.85);
  }
  const match = symptomMatch(symptoms, interaction.symptoms);
  const severityBoost =
    interaction.severity === "critical"
      ? 0.25
      : interaction.severity === "high"
        ? 0.18
        : interaction.severity === "moderate"
          ? 0.12
          : 0.06;
  return Math.min(95, Math.round((0.45 + match * 0.4 + severityBoost) * 100));
}

function findInteractions(medications, symptoms) {
  const found = [];
  const seen = new Set();

  for (let i = 0; i < medications.length; i++) {
    for (let j = i + 1; j < medications.length; j++) {
      const a = medications[i];
      const b = medications[j];
      const key = [a, b].sort().join("|");
      if (seen.has(key)) continue;

      const interaction = DRUG_INTERACTIONS[a]?.[b] ?? DRUG_INTERACTIONS[b]?.[a];
      if (interaction) {
        seen.add(key);
        const associated = interaction.symptoms.filter((s) =>
          symptoms.some(
            (sym) =>
              normalizeSymptom(sym) === normalizeSymptom(s) ||
              normalizeSymptom(sym).includes(normalizeSymptom(s))
          )
        );
        found.push({
          medications: [a, b],
          associatedSymptoms: associated.length > 0 ? associated : interaction.symptoms.slice(0, 3),
          severity: interaction.severity,
        });
      }
    }
  }

  return found.sort((x, y) => {
    const order = { critical: 0, high: 1, moderate: 2, low: 3 };
    return order[x.severity] - order[y.severity];
  });
}

function buildRankings(medications, symptoms) {
  const items = [];

  for (const med of medications) {
    items.push({ label: med, likelihood: getDrugLikelihood(med, symptoms) });
  }

  for (let i = 0; i < medications.length; i++) {
    for (let j = i + 1; j < medications.length; j++) {
      const a = medications[i];
      const b = medications[j];
      const hasInteraction = DRUG_INTERACTIONS[a]?.[b] ?? DRUG_INTERACTIONS[b]?.[a];
      if (hasInteraction || getDrugLikelihood(a, symptoms) > 40 || getDrugLikelihood(b, symptoms) > 40) {
        items.push({
          label: `${a} + ${b}`,
          likelihood: getCombinationLikelihood([a, b], symptoms),
        });
      }
    }
  }

  items.sort((a, b) => b.likelihood - a.likelihood);

  return items.slice(0, 6).map((item, i) => ({
    rank: i + 1,
    label: item.label,
    likelihood: item.likelihood,
  }));
}

function calculateOverallRisk(rankings, interactions) {
  const topLikelihood = rankings[0]?.likelihood ?? 0;
  const hasCritical = interactions.some((i) => i.severity === "critical");
  const hasHigh = interactions.some((i) => i.severity === "high");

  let level = "low";
  if (hasCritical || topLikelihood >= 85) level = "critical";
  else if (hasHigh || topLikelihood >= 70) level = "high";
  else if (topLikelihood >= 45 || interactions.length > 0) level = "moderate";

  const interactionBoost = interactions.reduce((sum, i) => {
    const w = i.severity === "critical" ? 25 : i.severity === "high" ? 18 : i.severity === "moderate" ? 10 : 4;
    return sum + w;
  }, 0);

  const score = Math.min(100, Math.round(topLikelihood * 0.7 + interactionBoost * 0.5));
  const confidence = Math.min(
    95,
    Math.round(55 + topLikelihood * 0.25 + (interactions.length > 0 ? 10 : 0))
  );

  return { level, score, confidence };
}

function buildReasoning(medications, symptoms, rankings, interactions) {
  const top = rankings[0];
  const symptomList = symptoms.slice(0, 3).join(" and ").toLowerCase();
  const parts = [];

  if (top) {
    if (top.label.includes("+")) {
      const [a, b] = top.label.split(" + ");
      parts.push(
        `The reported ${symptomList} may be linked to the combination of ${a} and ${b}.`
      );
      const match = interactions.find(
        (i) =>
          i.medications.includes(a) && i.medications.includes(b)
      );
      if (match) {
        parts.push(
          `Known interaction data suggests this pairing may worsen ${match.associatedSymptoms.join(" and ").toLowerCase()}.`
        );
      }
    } else {
      parts.push(
        `The reported ${symptomList} are commonly associated with ${top.label}.`
      );
      if (interactions.length > 0) {
        const combo = interactions[0];
        parts.push(
          `A detected interaction between ${combo.medications.join(" and ")} may also contribute to these symptoms.`
        );
      }
    }
    parts.push(
      `Based on side-effect profiles and interaction data, ${top.label} is the most likely contributor.`
    );
  } else {
    parts.push(
      `Limited side-effect overlap was found between ${medications.join(", ")} and the reported symptoms.`
    );
    parts.push("Consider evaluating other clinical factors beyond medication effects.");
  }

  return parts.slice(0, 3).join(" ");
}

function buildRecommendations(level, confidence, interactions, topCause) {
  if (confidence < 75) return [];

  const recs = [];

  if (level === "critical" || interactions.some((i) => i.severity === "critical")) {
    recs.push("Review this combination urgently and consider discontinuing or substituting a medication");
  }
  if (level === "high" || level === "critical") {
    recs.push("Monitor symptoms closely over the next 24–48 hours");
  }
  if (topCause && topCause.likelihood >= 70) {
    recs.push(`Review dosage and timing of ${topCause.label.split(" + ")[0]}`);
  }
  if (interactions.length > 0) {
    recs.push("Consider alternative medication with lower interaction risk");
  }
  recs.push("Evaluate additional patient factors such as renal function, age, and comorbidities");

  return recs.slice(0, 4);
}

export function analyzeMedicationRisk(request) {
  const { medications, symptoms } = request;
  const interactions = findInteractions(medications, symptoms);
  const rankings = buildRankings(medications, symptoms);
  const { level, score, confidence } = calculateOverallRisk(rankings, interactions);
  const reasoning = buildReasoning(medications, symptoms, rankings, interactions);
  const recommendations = buildRecommendations(level, confidence, interactions, rankings[0]);

  return {
    overallRisk: level,
    riskScore: score,
    confidence,
    rankings,
    interactions,
    reasoning,
    recommendations,
  };
}
