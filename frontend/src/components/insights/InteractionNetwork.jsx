import { buildNetwork } from "@/lib/analysis/network";

// Visual tokens per node tone — soft radial fills with a matching ring, echoing
// the calm blues / alarming reds of the reference design.
const TONE = {
  safe: { from: "#ecfdf5", to: "#bbf7d0", ring: "#6ee7b7", text: "#047857", halo: "#34d399" },
  neutral: { from: "#eff6ff", to: "#dbeafe", ring: "#bfdbfe", text: "#1e40af", halo: "#93c5fd" },
  moderate: { from: "#fffbeb", to: "#fde68a", ring: "#f59e0b", text: "#b45309", halo: "#fbbf24" },
  major: { from: "#fff1f2", to: "#fecaca", ring: "#ef4444", text: "#b91c1c", halo: "#f87171" },
};

const EDGE = {
  major: "#ef4444",
  moderate: "#f59e0b",
  minor: "#f59e0b",
};

function trim(p, q, r) {
  const dx = q.x - p.x;
  const dy = q.y - p.y;
  const len = Math.hypot(dx, dy) || 1;
  return { x: p.x + (dx / len) * r, y: p.y + (dy / len) * r };
}

function labelFont(name, base) {
  if (name.length > 11) return base - 3;
  if (name.length > 8) return base - 1.5;
  return base;
}

export function InteractionNetwork({ medications, interactions }) {
  const { nodes, edges, hasHarm, centerPair, flaggedCount } = buildNetwork(
    medications,
    interactions
  );

  const n = nodes.length;
  const W = 720;
  const nodeR = n <= 4 ? 46 : n <= 6 ? 42 : 36;
  const ringR = n <= 3 ? 116 : n <= 5 ? 150 : 178;
  const cx = W / 2;
  const H = ringR * 2 + nodeR * 2 + 56;
  const cy = (H - 30) / 2;

  // --- Layout: anchor the worst pair in the center, orbit the rest. ---
  const pos = {};
  if (centerPair) {
    const half = nodeR + 34;
    pos[centerPair[0]] = { x: cx - half, y: cy };
    pos[centerPair[1]] = { x: cx + half, y: cy };
    const orbit = nodes.filter((nd) => !centerPair.includes(nd.id));
    const m = Math.max(1, orbit.length);
    orbit.forEach((nd, i) => {
      const ang = ((-90 + (i * 360) / m) * Math.PI) / 180;
      pos[nd.id] = { x: cx + ringR * Math.cos(ang), y: cy + ringR * Math.sin(ang) };
    });
  } else {
    nodes.forEach((nd, i) => {
      const ang = ((-90 + (i * 360) / n) * Math.PI) / 180;
      pos[nd.id] = { x: cx + ringR * Math.cos(ang), y: cy + ringR * Math.sin(ang) };
    });
  }

  const fontBase = nodeR >= 44 ? 13 : nodeR >= 40 ? 12 : 11;

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="xMidYMid meet"
      className="h-auto w-full"
      role="img"
      aria-label="Medication interaction network"
    >
      <defs>
        {Object.entries(TONE).map(([key, t]) => (
          <radialGradient id={`netFill-${key}`} key={key} cx="38%" cy="32%" r="80%">
            <stop offset="0%" stopColor={t.from} />
            <stop offset="100%" stopColor={t.to} />
          </radialGradient>
        ))}
        <filter id="netGlow" x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur stdDeviation="4.5" />
        </filter>
      </defs>

      {/* ── Edges ── */}
      {edges.map((edge, i) => {
        const p = pos[edge.a];
        const q = pos[edge.b];
        if (!p || !q) return null;
        const a = trim(p, q, nodeR + 1);
        const b = trim(q, p, nodeR + 1);
        const color = EDGE[edge.level] ?? EDGE.moderate;
        const w = edge.level === "major" ? 4.5 : 3.5;
        const delay = `${0.25 + i * 0.05}s`;
        const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
        return (
          <g key={`${edge.a}-${edge.b}`}>
            {/* soft glow underlay */}
            <line
              x1={a.x} y1={a.y} x2={b.x} y2={b.y}
              stroke={color} strokeWidth={w + 6} opacity="0.22"
              filter="url(#netGlow)" className="net-edge"
              style={{ animationDelay: delay }}
            />
            {/* solid core */}
            <line
              x1={a.x} y1={a.y} x2={b.x} y2={b.y}
              stroke={color} strokeWidth={w}
              className="net-edge" style={{ animationDelay: delay }}
            />
            {/* animated flow to draw the eye toward harm */}
            <line
              x1={a.x} y1={a.y} x2={b.x} y2={b.y}
              stroke="#ffffff" strokeWidth={1.6} opacity="0.75"
              className="net-edge-flow"
            />
            {edge.level === "major" && (
              <g className="net-node" style={{ animationDelay: delay }}>
                <circle cx={mid.x} cy={mid.y} r="9" fill="#fff" stroke={color} strokeWidth="2" />
                <text
                  x={mid.x} y={mid.y + 4} textAnchor="middle"
                  fontSize="13" fontWeight="800" fill={color} className="net-label"
                >
                  !
                </text>
              </g>
            )}
          </g>
        );
      })}

      {/* ── Nodes ── */}
      {nodes.map((nd, i) => {
        const p = pos[nd.id];
        const t = TONE[nd.tone];
        const delay = `${i * 0.06}s`;
        return (
          <g key={nd.id}>
            {nd.flagged && (
              <circle
                cx={p.x} cy={p.y} r={nodeR + 8}
                fill={t.halo} className="net-halo"
                style={{ animationDelay: delay }}
              />
            )}
            <circle
              cx={p.x} cy={p.y} r={nodeR}
              fill={`url(#netFill-${nd.tone})`} stroke={t.ring} strokeWidth="2"
              className="net-node" style={{ animationDelay: delay }}
            />
            <text
              x={p.x} y={p.y + 4} textAnchor="middle"
              fontSize={labelFont(nd.id, fontBase)} fontWeight="600"
              fill={t.text} className="net-label net-node"
              style={{ animationDelay: delay }}
            >
              {nd.id}
            </text>
          </g>
        );
      })}

      {/* ── Caption ── */}
      <text
        x={cx} y={H - 12} textAnchor="middle"
        fontSize="12.5" fontWeight="600" className="net-label"
        fill={hasHarm ? "#b91c1c" : "#047857"}
      >
        {hasHarm
          ? `${flaggedCount} medication${flaggedCount > 1 ? "s" : ""} flagged for review`
          : "No harmful interactions detected"}
      </text>
    </svg>
  );
}
