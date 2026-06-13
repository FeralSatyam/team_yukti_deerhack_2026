// Maps the real ML microservice response into the same shape that
// buildPreviewAnalysis() returns, so all downstream UI works unchanged.
//
// Severity thresholds (pair_harm_score, 0-1):
//   >= 0.70  → 'high'
//   >= 0.40  → 'moderate'
//   <  0.40  → 'low'
// When any side effect in the pair is CRITICAL the interaction is promoted to 'critical'.

function mlSeverityToUi(mlSeverity) {
  switch ((mlSeverity || "").toUpperCase()) {
    case "CRITICAL": return "critical";
    case "HIGH":     return "high";
    case "MODERATE": return "moderate";
    default:         return "low";
  }
}

function harmScoreToSeverity(score, hasCritical = false) {
  if (hasCritical) return "critical";
  if (score >= 0.70) return "high";
  if (score >= 0.40) return "moderate";
  return "low";
}

// Generate drug pairs in the same alphabetical order the backend produces them
// so pair_details[i] aligns with pairs[i].
function buildPairs(medications) {
  const sorted = [...medications].sort((a, b) =>
    a.toLowerCase().localeCompare(b.toLowerCase())
  );
  const pairs = [];
  for (let i = 0; i < sorted.length; i++) {
    for (let j = i + 1; j < sorted.length; j++) {
      pairs.push([sorted[i], sorted[j]]);
    }
  }
  return pairs;
}

function buildHeadline(drugA, drugB, symptoms) {
  const symptomText =
    symptoms.length > 0
      ? symptoms.slice(0, 3).join(", ").toLowerCase()
      : "adverse effects";
  return `${drugA} + ${drugB} may be causing ${symptomText}`;
}

function buildExplanation(drugA, drugB, severity, symptoms) {
  const sevText = { critical: "critical", high: "high", moderate: "moderate", low: "low" }[severity] ?? "low";
  const symptomText =
    symptoms.length > 0 ? symptoms.join(", ").toLowerCase() : "adverse effects";
  return (
    `The ML model detected a ${sevText} interaction between ` +
    `${drugA} and ${drugB} based on shared protein-pathway topology. ` +
    `Top associated side effects: ${symptomText}.`
  );
}

// Validates that mlResult has the expected fields.
function validate(mlResult) {
  if (!mlResult || typeof mlResult !== "object") return false;
  if (typeof mlResult.harmful !== "boolean") return false;
  if (typeof mlResult.confidence !== "number") return false;
  if (!Array.isArray(mlResult.side_effects)) return false;
  if (!Array.isArray(mlResult.pair_details)) return false;
  return true;
}

export function mlResultToPreview(mlResult, medications) {
  if (!validate(mlResult)) {
    throw new Error("ML result failed schema validation.");
  }

  const confidence = Math.round(mlResult.confidence * 100);
  const pairs      = buildPairs(medications);

  // Build an interactions[] entry for each pair.
  // Severity is derived solely from pair_harm_score so it always matches the badge.
  const interactions = pairs.map(([drugA, drugB], idx) => {
    const detail      = mlResult.pair_details[idx] ?? {};
    const score       = typeof detail.pair_harm_score === "number" ? detail.pair_harm_score : mlResult.confidence;
    const pairSeNames = Array.isArray(detail.top_side_effects) ? detail.top_side_effects : [];
    return {
      medications:        [drugA, drugB],
      associatedSymptoms: pairSeNames.slice(0, 3),
      severity:           harmScoreToSeverity(score),
      _score:             score,
    };
  });

  // Build insights[] — one per pair, plus top global side effects as extras
  const insights = [];

  // One insight per drug pair only — severity matches the badge (harm score only).
  pairs.forEach(([drugA, drugB], idx) => {
    if (insights.length >= 5) return;
    const detail     = mlResult.pair_details[idx] ?? {};
    const score      = typeof detail.pair_harm_score === "number" ? detail.pair_harm_score : mlResult.confidence;
    const symptoms   = (Array.isArray(detail.top_side_effects) ? detail.top_side_effects : []).slice(0, 3);
    const severity   = harmScoreToSeverity(score);
    const likelihood = Math.round(score * 100);

    insights.push({
      id:                  `ml-pair-${idx}`,
      rank:                idx + 1,
      type:                "interaction",
      medications:         [drugA, drugB],
      headline:            buildHeadline(drugA, drugB, symptoms),
      symptoms,
      severity,
      likelihood,
      confidence,
      shortExplanation:    `Harm score: ${score.toFixed(2)}`,
      detailedExplanation: buildExplanation(drugA, drugB, severity, symptoms),
    });
  });

  const SEVERITY_ORDER = { critical: 0, high: 1, moderate: 2, low: 3 };
  const bySeverityDesc = (a, b) =>
    (SEVERITY_ORDER[a.severity] ?? 3) - (SEVERITY_ORDER[b.severity] ?? 3) ||
    b.likelihood - a.likelihood;

  insights.sort(bySeverityDesc);
  insights.forEach((item, i) => { item.rank = i + 1; });

  const sortedInteractions = [...interactions]
    .sort((a, b) =>
      (SEVERITY_ORDER[a.severity] ?? 3) - (SEVERITY_ORDER[b.severity] ?? 3) ||
      b._score - a._score
    )
    .map(({ _score, ...rest }) => rest); // strip internal field

  const hasSignificantFindings =
    mlResult.harmful ||
    sortedInteractions.some((i) => i.severity === "critical" || i.severity === "high") ||
    (insights[0]?.likelihood ?? 0) >= 40;

  return { insights: insights.slice(0, 5), interactions: sortedInteractions, confidence, hasSignificantFindings };
}
