"use client";

export interface CategoryRow {
  category: string;
  current: number;
  previous: number;
}

function fmtMoney(n: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);
}

export default function CategoryBreakdown({ rows }: { rows: CategoryRow[] }) {
  if (rows.length === 0) {
    return (
      <div style={card}>
        <h2 className="serif" style={{ fontSize: 20, marginBottom: 10 }}>Category breakdown</h2>
        <p style={{ fontSize: 13, color: "var(--color-ink-4)", textAlign: "center", padding: "20px 0" }}>
          No spending this month yet
        </p>
      </div>
    );
  }

  const maxVal = Math.max(...rows.map((r) => Math.max(r.current, r.previous)), 1);

  return (
    <div style={card}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 18 }}>
        <h2 className="serif" style={{ fontSize: 20 }}>Category breakdown</h2>
        <div style={{ display: "flex", gap: 14, fontSize: 11 }}>
          <span style={{ color: "var(--color-ink-3)", display: "flex", alignItems: "center", gap: 5 }}>
            <span style={{ width: 10, height: 10, background: "var(--color-bronze)", borderRadius: 2 }} />
            This month
          </span>
          <span style={{ color: "var(--color-ink-3)", display: "flex", alignItems: "center", gap: 5 }}>
            <span style={{ width: 10, height: 10, background: "var(--color-paper-deep)", borderRadius: 2 }} />
            Last month
          </span>
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {rows.map((r) => {
          const delta = r.previous > 0 ? ((r.current - r.previous) / r.previous) * 100 : null;
          const currentPct = (r.current / maxVal) * 100;
          const previousPct = (r.previous / maxVal) * 100;

          return (
            <div key={r.category}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 5 }}>
                <span style={{ fontSize: 13, color: "var(--color-ink)", fontWeight: 500 }}>{r.category}</span>
                <span style={{ display: "flex", gap: 12, alignItems: "baseline" }}>
                  <span className="mono" style={{ fontSize: 13, color: "var(--color-ink)" }}>
                    {fmtMoney(r.current)}
                  </span>
                  {delta != null && Math.abs(delta) >= 1 && (
                    <span style={{ fontSize: 10, color: delta > 0 ? "var(--color-red)" : "var(--color-green)" }}>
                      {delta > 0 ? "↑" : "↓"} {Math.abs(delta).toFixed(0)}%
                    </span>
                  )}
                </span>
              </div>
              {/* Two bars stacked: current (bronze, foreground) and previous (paper-deep, background reference) */}
              <div style={{ height: 18, background: "var(--color-paper)", borderRadius: 3, position: "relative", overflow: "hidden" }}>
                {/* Previous month — gray reference behind */}
                <div
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    height: "100%",
                    width: `${previousPct}%`,
                    background: "var(--color-paper-deep)",
                    borderRadius: 3,
                  }}
                />
                {/* Current month — bronze foreground */}
                <div
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    height: "100%",
                    width: `${currentPct}%`,
                    background: "var(--color-bronze)",
                    borderRadius: 3,
                    transition: "width 0.4s",
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
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
