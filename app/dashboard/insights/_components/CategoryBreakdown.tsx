"use client";

import { useState } from "react";

export interface CategoryDetailRow {
  subcategory: string;
  current: number;
  previous: number;
}

export interface CategoryRow {
  category: string;
  current: number;
  previous: number;
  details?: CategoryDetailRow[];
}

function fmtMoney(n: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);
}

export default function CategoryBreakdown({ rows }: { rows: CategoryRow[] }) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  function toggle(category: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(category)) next.delete(category);
      else next.add(category);
      return next;
    });
  }

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
          <span style={{ color: "var(--color-ink-4)", fontStyle: "italic" }}>
            click row to expand
          </span>
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {rows.map((r) => {
          const delta = r.previous > 0 ? ((r.current - r.previous) / r.previous) * 100 : null;
          const currentPct = (r.current / maxVal) * 100;
          const previousPct = (r.previous / maxVal) * 100;
          const isExpanded = expanded.has(r.category);
          const hasDetails = (r.details?.length ?? 0) > 0;

          return (
            <div key={r.category}>
              <button
                onClick={() => hasDetails && toggle(r.category)}
                disabled={!hasDetails}
                style={{
                  width: "100%",
                  textAlign: "left",
                  background: "transparent",
                  border: "none",
                  padding: 0,
                  cursor: hasDetails ? "pointer" : "default",
                  fontFamily: "inherit",
                }}
                aria-expanded={isExpanded}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 5 }}>
                  <span style={{ fontSize: 13, color: "var(--color-ink)", fontWeight: 500, display: "flex", alignItems: "center", gap: 6 }}>
                    {hasDetails && (
                      <span style={{ fontSize: 9, color: "var(--color-ink-4)", transform: isExpanded ? "rotate(90deg)" : "rotate(0deg)", transition: "transform 150ms" }}>
                        ▶
                      </span>
                    )}
                    {r.category}
                  </span>
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
                <div style={{ height: 18, background: "var(--color-paper)", borderRadius: 3, position: "relative", overflow: "hidden" }}>
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
              </button>

              {isExpanded && hasDetails && (
                <div style={{ marginTop: 8, marginLeft: 14, paddingLeft: 12, borderLeft: "2px solid var(--color-rule-soft)", display: "flex", flexDirection: "column", gap: 6 }}>
                  {r.details!.map((d) => {
                    const dDelta = d.previous > 0 ? ((d.current - d.previous) / d.previous) * 100 : null;
                    const dCurrentPct = (d.current / maxVal) * 100;
                    const dPreviousPct = (d.previous / maxVal) * 100;
                    return (
                      <div key={d.subcategory}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 3 }}>
                          <span style={{ fontSize: 12, color: "var(--color-ink-2)" }}>{d.subcategory}</span>
                          <span style={{ display: "flex", gap: 10, alignItems: "baseline" }}>
                            <span className="mono" style={{ fontSize: 12, color: "var(--color-ink-2)" }}>
                              {fmtMoney(d.current)}
                            </span>
                            {dDelta != null && Math.abs(dDelta) >= 1 && (
                              <span style={{ fontSize: 9, color: dDelta > 0 ? "var(--color-red)" : "var(--color-green)" }}>
                                {dDelta > 0 ? "↑" : "↓"} {Math.abs(dDelta).toFixed(0)}%
                              </span>
                            )}
                          </span>
                        </div>
                        <div style={{ height: 10, background: "var(--color-paper)", borderRadius: 2, position: "relative", overflow: "hidden" }}>
                          <div style={{ position: "absolute", top: 0, left: 0, height: "100%", width: `${dPreviousPct}%`, background: "var(--color-paper-deep)", borderRadius: 2 }} />
                          <div style={{ position: "absolute", top: 0, left: 0, height: "100%", width: `${dCurrentPct}%`, background: "var(--color-bronze)", opacity: 0.75, borderRadius: 2 }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
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
