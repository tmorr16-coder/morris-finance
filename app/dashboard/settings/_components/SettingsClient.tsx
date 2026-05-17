"use client";

import { useState, useTransition } from "react";
import { setAccountHidden } from "../actions";

export interface AccountRow {
  id: string;
  item_id: string;
  name: string;
  official_name: string | null;
  type: string;
  subtype: string | null;
  mask: string | null;
  current_balance: number | null;
  is_hidden: boolean;
}

function fmtMoney(n: number | null): string {
  if (n == null) return "—";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2 }).format(n);
}

const TYPE_LABEL: Record<string, string> = {
  depository: "Cash",
  credit: "Credit",
  loan: "Loan",
  investment: "Investment",
  brokerage: "Investment",
  other: "Other",
};

export default function SettingsClient({
  initialAccounts,
  itemNameById,
}: {
  initialAccounts: AccountRow[];
  itemNameById: Record<string, string>;
}) {
  const [accounts, setAccounts] = useState(initialAccounts);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function toggle(id: string, currentlyHidden: boolean) {
    setError(null);
    const next = !currentlyHidden;
    // Optimistic update
    setAccounts((prev) => prev.map((a) => (a.id === id ? { ...a, is_hidden: next } : a)));
    startTransition(async () => {
      const result = await setAccountHidden(id, next);
      if (result.error) {
        // Revert on error
        setAccounts((prev) => prev.map((a) => (a.id === id ? { ...a, is_hidden: currentlyHidden } : a)));
        setError(result.error);
      }
    });
  }

  // Group accounts by institution (item_id)
  const byInstitution = new Map<string, AccountRow[]>();
  for (const a of accounts) {
    if (!byInstitution.has(a.item_id)) byInstitution.set(a.item_id, []);
    byInstitution.get(a.item_id)!.push(a);
  }

  const visibleCount = accounts.filter((a) => !a.is_hidden).length;
  const hiddenCount = accounts.length - visibleCount;

  if (accounts.length === 0) {
    return (
      <div style={{ background: "var(--color-paper-card)", border: "1px solid var(--color-rule)", borderRadius: 12, padding: "40px 24px", textAlign: "center" }}>
        <p style={{ fontSize: 14, color: "var(--color-ink-3)" }}>No accounts connected yet.</p>
      </div>
    );
  }

  return (
    <>
      <section style={{ marginBottom: 24, padding: "12px 16px", background: "var(--color-paper-card)", border: "1px solid var(--color-rule)", borderRadius: 10, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ fontSize: 12, color: "var(--color-ink-3)" }}>
          <span className="mono" style={{ color: "var(--color-ink)" }}>{visibleCount}</span> visible ·{" "}
          <span className="mono" style={{ color: "var(--color-ink)" }}>{hiddenCount}</span> hidden
        </div>
        {isPending && <span style={{ fontSize: 11, color: "var(--color-ink-4)" }}>Saving…</span>}
      </section>

      {error && (
        <div style={{ marginBottom: 16, padding: "10px 14px", background: "rgba(154,59,42,0.08)", border: "1px solid var(--color-red)", borderRadius: 8, fontSize: 13, color: "var(--color-red)" }}>
          {error}
        </div>
      )}

      <section style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        {Array.from(byInstitution.entries()).map(([itemId, accts]) => (
          <div key={itemId}>
            <h2 className="serif" style={{ fontSize: 18, marginBottom: 10, color: "var(--color-ink)" }}>
              {itemNameById[itemId] ?? "Unknown institution"}
            </h2>
            <div style={{ background: "var(--color-paper-card)", border: "1px solid var(--color-rule)", borderRadius: 12, overflow: "hidden", boxShadow: "var(--shadow-card)" }}>
              {accts.map((a, idx) => (
                <div
                  key={a.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "14px 18px",
                    borderTop: idx === 0 ? undefined : "1px solid var(--color-rule-soft)",
                    opacity: a.is_hidden ? 0.55 : 1,
                  }}
                >
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                      <span style={{ fontSize: 14, fontWeight: 500, color: "var(--color-ink)" }}>{a.name}</span>
                      {a.mask && (
                        <span className="mono" style={{ fontSize: 11, color: "var(--color-ink-4)" }}>····{a.mask}</span>
                      )}
                    </div>
                    <div style={{ fontSize: 11, color: "var(--color-ink-3)", textTransform: "capitalize", marginTop: 2 }}>
                      {TYPE_LABEL[a.type] ?? a.type}
                      {a.subtype ? ` · ${a.subtype.replace(/_/g, " ")}` : ""}
                      <span className="mono" style={{ marginLeft: 10, color: "var(--color-ink-3)" }}>
                        {fmtMoney(a.current_balance)}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => toggle(a.id, a.is_hidden)}
                    disabled={isPending}
                    style={{
                      position: "relative",
                      width: 44,
                      height: 24,
                      borderRadius: 12,
                      border: "none",
                      background: a.is_hidden ? "var(--color-paper-deep)" : "var(--color-bronze)",
                      cursor: isPending ? "default" : "pointer",
                      transition: "background 150ms",
                      flexShrink: 0,
                    }}
                    aria-pressed={!a.is_hidden}
                    title={a.is_hidden ? "Hidden — click to show" : "Visible — click to hide"}
                  >
                    <span
                      style={{
                        position: "absolute",
                        top: 2,
                        left: a.is_hidden ? 2 : 22,
                        width: 20,
                        height: 20,
                        borderRadius: "50%",
                        background: "#fff",
                        boxShadow: "0 1px 3px rgba(0,0,0,0.15)",
                        transition: "left 150ms",
                      }}
                    />
                  </button>
                </div>
              ))}
            </div>
          </div>
        ))}
      </section>
    </>
  );
}
