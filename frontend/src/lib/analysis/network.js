// Turns the analysis output into a graph the network view can draw: one node
// per medication, one edge per detected interaction, and a per-node "tone" that
// captures the worst relationship that medication takes part in.
//
//   major    → red    (high / critical interaction)
//   moderate → amber  (moderate interaction)
//   neutral  → blue   (no interaction, but others in the set do interact)
//   safe     → green  (nothing in the whole set interacts)

function edgeLevel(severity) {
  if (severity === "critical" || severity === "high") return "major";
  if (severity === "moderate") return "moderate";
  return "minor";
}

// Worse-of ranking so a node flagged by any major link stays red.
const RANK = { major: 3, moderate: 2, minor: 1, none: 0 };

export function buildNetwork(medications, interactions = []) {
  const edges = interactions
    .map((ix) => {
      const [a, b] = ix.medications;
      if (!medications.includes(a) || !medications.includes(b)) return null;
      return { a, b, level: edgeLevel(ix.severity) };
    })
    .filter(Boolean);

  // Worst level each medication participates in.
  const worst = {};
  for (const edge of edges) {
    for (const med of [edge.a, edge.b]) {
      if (RANK[edge.level] > RANK[worst[med] ?? "none"]) worst[med] = edge.level;
    }
  }

  const hasHarm = edges.length > 0;

  const nodes = medications.map((med) => {
    let tone;
    if (!hasHarm) tone = "safe";
    else if (worst[med] === "major") tone = "major";
    else if (worst[med] === "moderate" || worst[med] === "minor") tone = "moderate";
    else tone = "neutral";
    return { id: med, tone, flagged: tone === "major" || tone === "moderate" };
  });

  // The single most severe interacting pair anchors the center of the layout.
  const centerEdge =
    [...edges].sort((x, y) => RANK[y.level] - RANK[x.level])[0] ?? null;
  const centerPair = centerEdge ? [centerEdge.a, centerEdge.b] : null;

  const flaggedCount = nodes.filter((n) => n.flagged).length;

  return { nodes, edges, hasHarm, centerPair, flaggedCount };
}
