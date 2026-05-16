"use client";

export interface MonthPoint {
  key: string;
  label: string;
  outflow: number;
  inflow: number;
}

function fmtMoney(n: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);
}

export default function MonthlyTrendChart({ data }: { data: MonthPoint[] }) {
  if (data.length === 0) {
    return (
      <div style={card}>
        <h2 className="serif" style={{ fontSize: 20, marginBottom: 10 }}>Monthly trend</h2>
        <p style={{ fontSize: 13, color: "var(--color-ink-4)", textAlign: "center", padding: "40px 0" }}>
          Not enough data yet
        </p>
      </div>
    );
  }

  const w = 800;
  const h = 200;
  const padL = 50;
  const padR = 20;
  const padT = 20;
  const padB = 40;
  const innerW = w - padL - padR;
  const innerH = h - padT - padB;

  const maxVal = Math.max(...data.flatMap((d) => [d.outflow, d.inflow]), 1);
  const xFor = (i: number) => padL + (data.length === 1 ? innerW / 2 : (i / (data.length - 1)) * innerW);
  const yFor = (v: number) => padT + innerH - (v / maxVal) * innerH;

  const outflowPath = data.map((d, i) => `${i === 0 ? "M" : "L"}${xFor(i).toFixed(1)},${yFor(d.outflow).toFixed(1)}`).join(" ");
  const inflowPath = data.map((d, i) => `${i === 0 ? "M" : "L"}${xFor(i).toFixed(1)},${yFor(d.inflow).toFixed(1)}`).join(" ");
  const outflowArea = `${outflowPath} L${xFor(data.length - 1).toFixed(1)},${h - padB} L${padL},${h - padB} Z`;

  // Y-axis labels — 4 ticks
  const yTicks = Array.from({ length: 4 }, (_, i) => (maxVal * (3 - i)) / 3);

  return (
    <div style={card}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 16 }}>
        <h2 className="serif" style={{ fontSize: 20 }}>Monthly trend</h2>
        <div style={{ display: "flex", gap: 14, fontSize: 11 }}>
          <span style={{ color: "var(--color-ink-3)", display: "flex", alignItems: "center", gap: 5 }}>
            <span style={{ width: 10, height: 10, background: "var(--color-red)", borderRadius: 2, display: "inline-block" }} />
            Outflow
          </span>
          <span style={{ color: "var(--color-ink-3)", display: "flex", alignItems: "center", gap: 5 }}>
            <span style={{ width: 10, height: 10, background: "var(--color-green)", borderRadius: 2, display: "inline-block" }} />
            Inflow
          </span>
        </div>
      </div>

      <svg viewBox={`0 0 ${w} ${h}`} style={{ width: "100%", height: "auto", display: "block" }}>
        {/* Grid lines + Y-axis labels */}
        {yTicks.map((tick, i) => {
          const y = padT + (innerH * i) / 3;
          return (
            <g key={i}>
              <line x1={padL} y1={y} x2={w - padR} y2={y} stroke="var(--color-rule-soft)" strokeWidth="1" />
              <text x={padL - 8} y={y + 3} fontSize="10" fill="#8C857C" textAnchor="end" fontFamily="JetBrains Mono, monospace">
                {fmtMoney(tick)}
              </text>
            </g>
          );
        })}

        {/* Outflow filled area */}
        <path d={outflowArea} fill="var(--color-red)" fillOpacity="0.1" />

        {/* Outflow line */}
        <path d={outflowPath} fill="none" stroke="var(--color-red)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />

        {/* Inflow line */}
        <path d={inflowPath} fill="none" stroke="var(--color-green)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="0" />

        {/* Data point dots */}
        {data.map((d, i) => (
          <g key={d.key}>
            <circle cx={xFor(i)} cy={yFor(d.outflow)} r="3.5" fill="#FBF8F1" stroke="var(--color-red)" strokeWidth="1.5" />
            <circle cx={xFor(i)} cy={yFor(d.inflow)} r="3.5" fill="#FBF8F1" stroke="var(--color-green)" strokeWidth="1.5" />
            <text x={xFor(i)} y={h - padB + 16} fontSize="10" fill="#8C857C" textAnchor="middle" fontFamily="Geist, system-ui">
              {d.label}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}

const card: React.CSSProperties = {
  background: "var(--color-paper-card)",
  border: "1px solid var(--color-rule)",
  borderRadius: 12,
  padding: "20px 24px",
  boxShadow: "var(--shadow-card)",
};
