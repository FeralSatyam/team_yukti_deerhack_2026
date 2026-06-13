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
  const sevText =
    severity === "critical" || severity === "high" ? "high-priority" : "moderate";
  const symptomText =
    symptoms.length > 0 ? symptoms.join(", ").toLowerCase() : "adverse effects";
  return (
    `The ML model detected a ${sevText} pharmacodynamic interaction between ` +
    `${drugA} and ${drugB} based on shared protein-pathway topology. ` +
    `Associated side effects include ${symptomText}. ` +
    `Confidence reflects the model's harm score (0-1) mapped to this severity tier.`
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

  // Build an interactions[] entry for each pair
  const interactions = pairs.map(([drugA, drugB], idx) => {
    const detail = mlResult.pair_details[idx] ?? {};
    const score  = typeof detail.pair_harm_score === "number" ? detail.pair_harm_score : mlResult.confidence;

    // Find side effects for this pair from the global list (top by probability)
    const pairSeNames = Array.isArray(detail.top_side_effects)
      ? detail.top_side_effects
      : [];

    // Check if any matching global SE is CRITICAL
    const hasCritical = mlResult.side_effects.some(
      (se) => pairSeNames.includes(se.name) && se.severity === "CRITICAL"
    );

    return {
      medications:       [drugA, drugB],
      associatedSymptoms: pairSeNames.slice(0, 3),
      severity:           harmScoreToSeverity(score, hasCritical),
    };
  });

  // Build insights[] — one per pair, plus top global side effects as extras
  const insights = [];

  pairs.forEach(([drugA, drugB], idx) => {
    if (insights.length >= 5) return;
    const detail   = mlResult.pair_details[idx] ?? {};
    const score    = typeof detail.pair_harm_score === "number" ? detail.pair_harm_score : mlResult.confidence;
    const symptoms = Array.isArray(detail.top_side_effects) ? detail.top_side_effects : [];
    const hasCritical = mlResult.side_effects.some(
      (se) => symptoms.includes(se.name) && se.severity === "CRITICAL"
    );
    const severity = harmScoreToSeverity(score, hasCritical);
    const likelihood = Math.round(score * 100);

    insights.push({
      id:               `ml-pair-${idx}`,
      rank:             idx + 1,
      type:             "interaction",
      medications:      [drugA, drugB],
      headline:         buildHeadline(drugA, drugB, symptoms),
      symptoms,
      severity,
      likelihood,
      confidence,
      shortExplanation: `ML model flagged this pair with harm score ${score.toFixed(2)}.`,
      detailedExplanation: buildExplanation(drugA, drugB, severity, symptoms),
    });
  });

  // Fill remaining slots (up to 5) with the top global side effects not yet covered
  const coveredSymptoms = new Set(insights.flatMap((i) => i.symptoms));
  for (const se of mlResult.side_effects) {
    if (insights.length >= 5) break;
    if (coveredSymptoms.has(se.name)) continue;
    insights.push({
      id:               `ml-se-${se.name.replace(/\s+/g, "-").toLowerCase()}`,
      rank:             insights.length + 1,
      type:             "side_effect",
      medications,
      headline:         `${medications.join(" + ")} associated with ${se.name.toLowerCase()}`,
      symptoms:         [se.name],
      severity:         mlSeverityToUi(se.severity),
      likelihood:       Math.round(se.probability * 100),
      confidence,
      shortExplanation: `Side effect detected with probability ${(se.probability * 100).toFixed(0)}%.`,
      detailedExplanation:
        `The model predicted ${se.name} with ${(se.probability * 100).toFixed(0)}% probability ` +
        `for this drug combination. Category: ${se.category || "Unknown"}.`,
    });
    coveredSymptoms.add(se.name);
  }

  insights.forEach((item, i) => { item.rank = i + 1; });

  const hasSignificantFindings =
    mlResult.harmful ||
    interactions.some((i) => i.severity === "critical" || i.severity === "high") ||
    (insights[0]?.likelihood ?? 0) >= 40;

  return { insights: insights.slice(0, 5), interactions, confidence, hasSignificantFindings };
}
