export const dynamic = "force-dynamic";

import { createClient, createServiceClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import SignOutButton from "./_components/SignOutButton";
import ConnectSection from "./_components/ConnectSection";

interface AccountRow {
  id: string;
  name: string;
  official_name: string | null;
  type: string;
  subtype: string | null;
  mask: string | null;
  current_balance: number | null;
  iso_currency_code: string;
}

interface ItemRow {
  id: string;
  institution_name: string;
  status: string;
  last_synced_at: string | null;
  accounts: AccountRow[];
}

function fmtMoney(n: number | null, currency = "USD"): string {
  if (n == null) return "—";
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(n);
}

function relativeTime(iso: string | null): string {
  if (!iso) return "never";
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/");

  // Fetch via service client because finance is a separate schema with strict RLS
  const service = createServiceClient();

  const { data: itemRows } = await service
    .schema("finance")
    .from("plaid_items")
    .select("id, institution_name, status, last_synced_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true });

  const items: ItemRow[] = [];
  if (itemRows && itemRows.length > 0) {
    const itemIds = itemRows.map((r) => r.id);
    const { data: accountRows } = await service
      .schema("finance")
      .from("accounts")
      .select("id, item_id, name, official_name, type, subtype, mask, current_balance, iso_currency_code")
      .in("item_id", itemIds);

    for (const it of itemRows) {
      items.push({
        ...it,
        accounts: (accountRows ?? []).filter((a) => a.item_id === it.id),
      });
    }
  }

  const name = user.user_metadata?.full_name ?? user.user_metadata?.name ?? user.email ?? "there";
  const totalBalance = items.flatMap((i) => i.accounts).reduce((s, a) => s + (a.current_balance ?? 0), 0);

  return (
    <div style={{ maxWidth: 1180, margin: "0 auto", padding: "20px 28px 80px" }}>

      {/* Header */}
      <header
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          paddingBottom: 18,
          borderBottom: "1px solid var(--color-rule)",
          marginBottom: 36,
        }}
      >
        <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
          <span style={{ width: 5, height: 5, borderRadius: "50%", background: "var(--color-bronze)", display: "inline-block", alignSelf: "center" }} />
          <span className="serif" style={{ fontSize: 22 }}>finance</span>
          <span style={{ color: "var(--color-ink-3)", fontSize: 12, letterSpacing: "0.04em", textTransform: "uppercase", marginLeft: 14, paddingLeft: 14, borderLeft: "1px solid var(--color-rule)" }}>
            morrisai.family
          </span>
        </div>
        <SignOutButton />
      </header>

      {/* Greeting + total */}
      <div style={{ marginBottom: 36, display: "flex", alignItems: "flex-end", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
        <div>
          <div style={{ fontSize: 10, fontWeight: 500, letterSpacing: "0.16em", textTransform: "uppercase", color: "var(--color-ink-3)", marginBottom: 8 }}>
            {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
          </div>
          <h1 className="serif" style={{ fontSize: 36, lineHeight: 1.1 }}>
            Welcome, {name.split(" ")[0]}.
          </h1>
        </div>
        {items.length > 0 && (
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 10, fontWeight: 500, letterSpacing: "0.16em", textTransform: "uppercase", color: "var(--color-ink-3)", marginBottom: 4 }}>
              Total balance
            </div>
            <div className="mono" style={{ fontSize: 30, fontWeight: 500, color: "var(--color-ink)" }}>
              {fmtMoney(totalBalance)}
            </div>
          </div>
        )}
      </div>

      {items.length === 0 ? (
        /* ── Empty state ───────────────────────────────────────────────── */
        <div
          style={{
            background: "var(--color-paper-card)",
            border: "1px solid var(--color-rule)",
            borderRadius: 12,
            padding: "44px 32px",
            textAlign: "center",
            boxShadow: "var(--shadow-card)",
          }}
        >
          <div style={{ width: 48, height: 48, borderRadius: 12, background: "var(--color-paper-deep)", display: "inline-flex", alignItems: "center", justifyContent: "center", marginBottom: 18, fontSize: 22, color: "var(--color-bronze-dark)" }}>
            ◐
          </div>
          <h2 className="serif" style={{ fontSize: 22, marginBottom: 8 }}>
            No accounts connected yet
          </h2>
          <p style={{ fontSize: 14, color: "var(--color-ink-3)", maxWidth: 320, margin: "0 auto 24px", lineHeight: 1.6 }}>
            Connect your first bank to start importing transactions and balances. Your access tokens are encrypted before storage.
          </p>
          <ConnectSection />
          <p style={{ fontSize: 11, color: "var(--color-ink-4)", marginTop: 18 }}>
            Sandbox test: any institution — use <code style={{ background: "var(--color-paper-deep)", padding: "1px 6px", borderRadius: 3 }}>user_good</code> / <code style={{ background: "var(--color-paper-deep)", padding: "1px 6px", borderRadius: 3 }}>pass_good</code>
          </p>
        </div>
      ) : (
        /* ── Connected institutions ────────────────────────────────────── */
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {items.map((it) => (
            <div
              key={it.id}
              style={{
                background: "var(--color-paper-card)",
                border: "1px solid var(--color-rule)",
                borderRadius: 12,
                padding: "20px 24px",
                boxShadow: "var(--shadow-card)",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 14 }}>
                <div className="serif" style={{ fontSize: 20 }}>
                  {it.institution_name}
                </div>
                <span style={{ fontSize: 11, color: it.status === "active" ? "var(--color-green)" : "var(--color-red)", textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 600 }}>
                  {it.status === "active" ? "● Connected" : `● ${it.status}`}
                  <span style={{ color: "var(--color-ink-4)", marginLeft: 8, fontWeight: 400 }}>
                    synced {relativeTime(it.last_synced_at)}
                  </span>
                </span>
              </div>

              <div style={{ display: "flex", flexDirection: "column" }}>
                {it.accounts.map((a, idx) => (
                  <div
                    key={a.id}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "baseline",
                      padding: "10px 0",
                      borderTop: idx > 0 ? "1px solid var(--color-rule-soft)" : undefined,
                    }}
                  >
                    <div>
                      <div style={{ fontSize: 14, color: "var(--color-ink)", fontWeight: 500 }}>
                        {a.name} {a.mask && <span style={{ color: "var(--color-ink-3)", fontWeight: 400 }}>···{a.mask}</span>}
                      </div>
                      <div style={{ fontSize: 11, color: "var(--color-ink-3)", textTransform: "capitalize", marginTop: 2 }}>
                        {a.subtype ?? a.type}
                      </div>
                    </div>
                    <div className="mono" style={{ fontSize: 16, color: "var(--color-ink)" }}>
                      {fmtMoney(a.current_balance, a.iso_currency_code)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}

          <div style={{ marginTop: 8 }}>
            <ConnectSection label="Connect another bank" variant="secondary" />
          </div>
        </div>
      )}

    </div>
  );
}
