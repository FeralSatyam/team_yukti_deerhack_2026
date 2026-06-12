import { analyzeMedicationRisk } from "@/lib/analysis/engine";

const SIDE_EFFECT_EXPLANATIONS = {
  Metformin: {
    Nausea: "Metformin commonly causes GI upset, especially when initiating therapy or at higher doses.",
    Vomiting: "Gastrointestinal intolerance is a well-documented adverse effect of metformin.",
    Fatigue: "Metformin-related B12 deficiency or GI distress may present as fatigue.",
  },
  Ondansetron: {
    Dizziness: "Ondansetron may cause mild CNS effects including dizziness in sensitive patients.",
    Headache: "Headache is among the most frequently reported side effects of 5-HT3 antagonists.",
    Fatigue: "Sedation and fatigue can occur with antiemetic therapy.",
  },
  Tramadol: {
    Nausea: "Tramadol activates opioid and serotonergic pathways that commonly trigger nausea.",
    Dizziness: "Orthostatic dizziness is a frequent adverse effect of tramadol.",
    Confusion: "CNS depression and serotonergic activity may cause confusion, especially in elderly patients.",
  },
  Warfarin: {
    Nausea: "Warfarin itself rarely causes nausea, but bleeding complications may present with GI symptoms.",
  },
  Ibuprofen: {
    Nausea: "NSAIDs irritate the gastric mucosa and frequently cause nausea.",
    Dizziness: "Fluid retention and renal effects may contribute to dizziness.",
  },
};

const INTERACTION_EXPLANATIONS = {
  "Metformin|Ondansetron":
    "Combining metformin with ondansetron may compound gastrointestinal effects. Both agents can affect gut motility and tolerance.",
  "Warfarin|Ibuprofen":
    "NSAIDs inhibit platelet function and can cause GI bleeding, dramatically increasing anticoagulant risk. This is a high-priority interaction.",
  "Sertraline|Tramadol":
    "Both drugs increase serotonergic activity. Combined use raises the risk of serotonin syndrome including confusion and dizziness.",
  "Ondansetron|Tramadol":
    "Additive serotonergic effects may increase CNS side effects including headache and confusion.",
};

function toVisualSeverity(severity) {
  if (severity === "critical" || severity === "high") return "high";
  if (severity === "moderate") return "moderate";
  return "low";
}

function interactionKey(a, b) {
  return [a, b].sort().join("|");
}

function getDetailedExplanation(type, medications, symptoms, severity) {
  if (type === "interaction" && medications.length === 2) {
    const key = interactionKey(medications[0], medications[1]);
    const specific = INTERACTION_EXPLANATIONS[key];
    if (specific) return specific;
    return `Pharmacodynamic or pharmacokinetic overlap between ${medications[0]} and ${medications[1]} may amplify ${symptoms.join(", ").toLowerCase()}. Severity is classified as ${severity} based on established interaction databases.`;
  }

  if (type === "side_effect" && medications.length === 1) {
    const med = medications[0];
    for (const symptom of symptoms) {
      const explanation = SIDE_EFFECT_EXPLANATIONS[med]?.[symptom];
      if (explanation) return explanation;
    }
    return `${medications[0]} has documented adverse effects including ${symptoms.join(", ").toLowerCase()}. Individual patient factors such as dose, duration, and renal function influence presentation.`;
  }

  return `The symptom pattern of ${symptoms.join(", ").toLowerCase()} aligns with known adverse effect profiles for ${medications.join(" and ")}. Correlation does not confirm causation — evaluate timing, dose changes, and alternative diagnoses.`;
}

function buildHeadline(type, medications, symptoms) {
  const symptomText =
    symptoms.length > 0
      ? symptoms.slice(0, 4).join(", ").toLowerCase()
      : "nausea, dizziness, fatigue, or other symptoms";

  if (type === "interaction" && medications.length === 2) {
    return `${medications[0]} + ${medications[1]} may be causing your ${symptomText}`;
  }
  if (type === "side_effect") {
    return `${medications[0]} may be contributing to ${symptomText}`;
  }
  return `${medications[0]} may be linked to ${symptomText}`;
}

function insightFromInteraction(interaction, rank, likelihood, confidence) {
  const severity = toVisualSeverity(interaction.severity);
  const type = "interaction";

  return {
    id: `interaction-${interaction.medications.join("-")}`,
    rank,
    type,
    medications: interaction.medications,
    headline: buildHeadline(type, interaction.medications, interaction.associatedSymptoms),
    symptoms: interaction.associatedSymptoms,
    severity,
    likelihood,
    confidence,
    shortExplanation: `Known interaction with ${severity} severity profile.`,
    detailedExplanation: getDetailedExplanation(
      type,
      interaction.medications,
      interaction.associatedSymptoms,
      severity
    ),
  };
}

function insightFromRanking(label, likelihood, rank, confidence, patientSymptoms) {
  const isCombo = label.includes(" + ");

  if (isCombo) {
    const medications = label.split(" + ").map((s) => s.trim());
    const symptoms =
      patientSymptoms.length > 0
        ? patientSymptoms.slice(0, 3)
        : ["nausea", "dizziness", "fatigue"];
    const severity =
      likelihood >= 70 ? "high" : likelihood >= 45 ? "moderate" : "low";

    return {
      id: `combo-${medications.join("-")}`,
      rank,
      type: "interaction",
      medications,
      headline: buildHeadline("interaction", medications, symptoms),
      symptoms,
      severity,
      likelihood,
      confidence,
      shortExplanation: `Combination therapy may compound adverse effects.`,
      detailedExplanation: getDetailedExplanation(
        "interaction",
        medications,
        symptoms,
        severity
      ),
    };
  }

  const symptoms =
    patientSymptoms.length > 0
      ? patientSymptoms.slice(0, 3)
      : ["fatigue", "nausea", "headache"];
  const severity =
    likelihood >= 65 ? "moderate" : likelihood >= 40 ? "moderate" : "low";

  return {
    id: `drug-${label}`,
    rank,
    type: patientSymptoms.length > 0 ? "side_effect" : "symptom_pattern",
    medications: [label],
    headline: buildHeadline(
      patientSymptoms.length > 0 ? "side_effect" : "symptom_pattern",
      [label],
      symptoms
    ),
    symptoms,
    severity,
    likelihood,
    confidence,
    shortExplanation: `Single-agent side-effect profile matches reported pattern.`,
    detailedExplanation: getDetailedExplanation(
      patientSymptoms.length > 0 ? "side_effect" : "symptom_pattern",
      [label],
      symptoms,
      severity
    ),
  };
}

export function buildPreviewAnalysis(medications, symptoms = []) {
  if (medications.length < 2) return null;

  const result = analyzeMedicationRisk({ medications, symptoms });
  const insights = [];
  const seen = new Set();

  result.interactions.forEach((interaction, index) => {
    const matchingRank = result.rankings.find((r) => {
      if (!r.label.includes("+")) return false;
      const meds = r.label.split(" + ").map((s) => s.trim());
      return (
        meds.includes(interaction.medications[0]) &&
        meds.includes(interaction.medications[1])
      );
    });

    const id = `interaction-${interaction.medications.join("-")}`;
    if (!seen.has(id)) {
      seen.add(id);
      insights.push(
        insightFromInteraction(
          interaction,
          index + 1,
          matchingRank?.likelihood ?? 60,
          result.confidence
        )
      );
    }
  });

  result.rankings.forEach((ranking) => {
    const id = ranking.label.includes("+")
      ? `combo-${ranking.label.replace(/ \+ /g, "-")}`
      : `drug-${ranking.label}`;

    if (!seen.has(id)) {
      seen.add(id);
      const insight = insightFromRanking(
        ranking.label,
        ranking.likelihood,
        ranking.rank,
        result.confidence,
        symptoms
      );
      if (insight) insights.push(insight);
    }
  });

  insights.sort((a, b) => b.likelihood - a.likelihood);
  insights.forEach((item, i) => {
    item.rank = i + 1;
  });

  const hasSignificantFindings =
    result.interactions.length > 0 ||
    (insights[0]?.likelihood ?? 0) >= 40;

  return {
    insights: insights.slice(0, 5),
    interactions: result.interactions,
    confidence: result.confidence,
    hasSignificantFindings,
  };
}

export function getPrimaryInsight(preview, allMedications = []) {
  if (!preview || preview.insights.length === 0) return null;

  const interactionInsight = preview.insights.find(
    (i) => i.medications.length >= 2
  );

  const primary = interactionInsight ?? preview.insights[0];

  if (primary.medications.length < 2 && allMedications.length >= 2) {
    const medA = primary.medications[0] ?? allMedications[0];
    const medB = allMedications.find((m) => m !== medA) ?? allMedications[1];
    return {
      ...primary,
      medications: [medA, medB],
      type: "interaction",
    };
  }

  return primary;
}
