export const dynamic = "force-dynamic";

import { createClient, createServiceClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import SignOutButton from "./_components/SignOutButton";
import ConnectSection from "./_components/ConnectSection";
import SyncNowButton from "./_components/SyncNowButton";

interface AccountRow {
  id: string;
  item_id: string;
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
}

interface TxRow {
  id: string;
  account_id: string;
  date: string;
  amount: number;
  merchant_name: string | null;
  name: string;
  pending: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  personal_finance_category: any;
}

function fmtMoney(n: number | null, currency = "USD"): string {
  if (n == null) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n);
}

function fmtMoneyLarge(n: number): { whole: string; cents: string } {
  const sign = n < 0 ? "−" : "";
  const abs = Math.abs(n);
  const whole = Math.floor(abs);
  const cents = Math.round((abs - whole) * 100).toString().padStart(2, "0");
  return {
    whole: `${sign}$${whole.toLocaleString()}`,
    cents: `.${cents}`,
  };
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

function fmtTxDate(iso: string): string {
  const d = new Date(iso + "T12:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function categoryFromPFC(pfc: { primary?: string; detailed?: string } | null): string | null {
  if (!pfc?.primary) return null;
  return pfc.primary
    .toLowerCase()
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const service = createServiceClient();

  // Fetch items, accounts, recent transactions in parallel
  const [
    { data: itemRows },
    { data: accountRowsRaw },
    { data: txRowsRaw },
  ] = await Promise.all([
    service
      .schema("finance")
      .from("plaid_items")
      .select("id, institution_name, status, last_synced_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true }),
    service
      .schema("finance")
      .from("accounts")
      .select("id, item_id, name, official_name, type, subtype, mask, current_balance, iso_currency_code")
      .order("type", { ascending: true })
      .order("name", { ascending: true }),
    service
      .schema("finance")
      .from("transactions")
      .select("id, account_id, date, amount, merchant_name, name, pending, personal_finance_category")
      .order("date", { ascending: false })
      .limit(50),
  ]);

  const items: ItemRow[] = (itemRows as ItemRow[]) ?? [];
  const accounts: AccountRow[] = (accountRowsRaw as AccountRow[]) ?? [];
  const transactions: TxRow[] = (txRowsRaw as TxRow[]) ?? [];

  const accountById = new Map(accounts.map((a) => [a.id, a]));
  const name = user.user_metadata?.full_name ?? user.user_metadata?.name ?? user.email ?? "there";
  const firstName = name.split(" ")[0];

  // Net position = sum of all account current balances
  // (credit card balances are reported positive by Plaid even though they're liabilities;
  // we subtract them to get net worth)
  const netPosition = accounts.reduce((sum, a) => {
    const bal = a.current_balance ?? 0;
    return sum + (a.type === "credit" || a.type === "loan" ? -bal : bal);
  }, 0);
  const netFmt = fmtMoneyLarge(netPosition);

  const lastSyncAcrossItems = items.reduce<string | null>((latest, it) => {
    if (!it.last_synced_at) return latest;
    if (!latest || it.last_synced_at > latest) return it.last_synced_at;
    return latest;
  }, null);

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    return "Good evening";
  })();

  return (
    <div>

      {/* ── Header ────────────────────────────────────────────────────── */}
      <header
        style={{
          borderBottom: "1px solid var(--color-rule)",
          background: "var(--color-paper)",
          position: "sticky",
          top: 0,
          zIndex: 10,
          backdropFilter: "blur(8px)",
        }}
      >
        <div
          style={{
            maxWidth: 1180,
            margin: "0 auto",
            padding: "16px 28px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 24,
            flexWrap: "wrap",
          }}
        >
          <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
            <span style={{ width: 5, height: 5, borderRadius: "50%", background: "var(--color-bronze)", alignSelf: "center" }} />
            <span className="serif" style={{ fontSize: 22 }}>morrisai</span>
            <span className="serif" style={{ color: "var(--color-bronze-dark)", fontStyle: "italic" }}>.family</span>
            <span style={{ color: "var(--color-ink-3)", fontSize: 12, letterSpacing: "0.04em", textTransform: "uppercase", marginLeft: 14, paddingLeft: 14, borderLeft: "1px solid var(--color-rule)" }}>
              finance
            </span>
          </div>

          <nav style={{ display: "flex", gap: 22, fontSize: 13, letterSpacing: "0.02em" }}>
            <a href="#overview" style={{ color: "var(--color-ink)", textDecoration: "none", padding: "6px 0", borderBottom: "1px solid var(--color-bronze)", fontWeight: 500 }}>Overview</a>
            <a href="#activity" style={{ color: "var(--color-ink-2)", textDecoration: "none", padding: "6px 0" }}>Activity</a>
            <a href="#accounts" style={{ color: "var(--color-ink-2)", textDecoration: "none", padding: "6px 0" }}>Accounts</a>
          </nav>

          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <SyncNowButton />
            <SignOutButton />
          </div>
        </div>
      </header>

      <main style={{ maxWidth: 1180, margin: "0 auto", padding: "32px 28px 80px" }}>

        {/* ── Hero ────────────────────────────────────────────────────── */}
        <section
          id="overview"
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-end",
            gap: 24,
            marginBottom: 32,
            paddingBottom: 24,
            borderBottom: "1px solid var(--color-rule)",
            flexWrap: "wrap",
          }}
        >
          <div>
            <div style={{ fontSize: 10, fontWeight: 500, letterSpacing: "0.16em", textTransform: "uppercase", color: "var(--color-ink-3)", marginBottom: 10 }}>
              {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
            </div>
            <h1 className="serif" style={{ fontSize: 44, lineHeight: 1.05 }}>
              {greeting},
              <br />
              <span style={{ fontStyle: "italic", color: "var(--color-bronze-dark)" }}>{firstName}.</span>
            </h1>
            {items.length > 0 && (
              <p style={{ fontSize: 14, color: "var(--color-ink-3)", maxWidth: 460, marginTop: 14, lineHeight: 1.55 }}>
                {items.length} institution{items.length !== 1 ? "s" : ""} connected ·
                last sync {relativeTime(lastSyncAcrossItems)} ·
                {transactions.length} recent transaction{transactions.length !== 1 ? "s" : ""}
              </p>
            )}
          </div>

          {items.length > 0 && (
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 10, fontWeight: 500, letterSpacing: "0.16em", textTransform: "uppercase", color: "var(--color-ink-3)", marginBottom: 6 }}>
                Net position
              </div>
              <div className="mono" style={{ fontSize: 42, fontWeight: 500, color: "var(--color-ink)", letterSpacing: "-0.02em", lineHeight: 1 }}>
                {netFmt.whole}
                <span style={{ fontSize: "0.55em", color: "var(--color-ink-3)" }}>{netFmt.cents}</span>
              </div>
              <div style={{ fontSize: 12, color: "var(--color-ink-3)", marginTop: 6 }}>
                across {accounts.length} account{accounts.length !== 1 ? "s" : ""}
              </div>
            </div>
          )}
        </section>

        {items.length === 0 ? (
          /* ── Empty state ─────────────────────────────────────────── */
          <div
            style={{
              background: "var(--color-paper-card)",
              border: "1px solid var(--color-rule)",
              borderRadius: 12,
              padding: "60px 32px",
              textAlign: "center",
              boxShadow: "var(--shadow-card)",
            }}
          >
            <div style={{ width: 48, height: 48, borderRadius: 12, background: "var(--color-paper-deep)", display: "inline-flex", alignItems: "center", justifyContent: "center", marginBottom: 18, fontSize: 22, color: "var(--color-bronze-dark)" }}>
              ◐
            </div>
            <h2 className="serif" style={{ fontSize: 24, marginBottom: 8 }}>No accounts connected yet</h2>
            <p style={{ fontSize: 14, color: "var(--color-ink-3)", maxWidth: 360, margin: "0 auto 24px", lineHeight: 1.6 }}>
              Connect your first bank to start importing transactions. Your access tokens are encrypted before storage.
            </p>
            <ConnectSection />
            <p style={{ fontSize: 11, color: "var(--color-ink-4)", marginTop: 18 }}>
              Sandbox: use <code style={{ background: "var(--color-paper-deep)", padding: "1px 6px", borderRadius: 3 }}>user_good</code> / <code style={{ background: "var(--color-paper-deep)", padding: "1px 6px", borderRadius: 3 }}>pass_good</code>
            </p>
          </div>
        ) : (
          <>
            {/* ── Institutions row ────────────────────────────────── */}
            <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14, marginBottom: 36 }}>
              {items.map((it) => {
                const acctsForItem = accounts.filter((a) => a.item_id === it.id);
                const balForItem = acctsForItem.reduce((s, a) => s + (a.current_balance ?? 0), 0);
                return (
                  <div
                    key={it.id}
                    style={{
                      background: "var(--color-paper-card)",
                      border: "1px solid var(--color-rule)",
                      borderRadius: 12,
                      padding: "16px 18px",
                      boxShadow: "var(--shadow-card)",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                      <span className="serif" style={{ fontSize: 18 }}>{it.institution_name}</span>
                      <span style={{ fontSize: 10, color: it.status === "active" ? "var(--color-green)" : "var(--color-red)", textTransform: "uppercase", letterSpacing: "0.08em", fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 5 }}>
                        <span style={{ width: 6, height: 6, borderRadius: "50%", background: it.status === "active" ? "var(--color-green)" : "var(--color-red)", display: "inline-block" }} />
                        {it.status === "active" ? "Synced" : it.status}
                      </span>
                    </div>
                    <div style={{ fontSize: 11, color: "var(--color-ink-3)", marginBottom: 10 }}>
                      {acctsForItem.length} account{acctsForItem.length !== 1 ? "s" : ""} · {relativeTime(it.last_synced_at)}
                    </div>
                    <div className="mono" style={{ fontSize: 22, color: "var(--color-ink)", fontWeight: 500 }}>
                      {fmtMoney(balForItem)}
                    </div>
                  </div>
                );
              })}
            </section>

            {/* ── Accounts grid ───────────────────────────────────── */}
            <section id="accounts" style={{ marginBottom: 36 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 14, paddingBottom: 10, borderBottom: "1px solid var(--color-rule)" }}>
                <h2 className="serif" style={{ fontSize: 24 }}>Accounts</h2>
                <span style={{ fontSize: 11, color: "var(--color-ink-3)", letterSpacing: "0.08em", textTransform: "uppercase" }}>
                  {accounts.length} connected
                </span>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 14 }}>
                {accounts.map((a) => {
                  const isLiability = a.type === "credit" || a.type === "loan";
                  const bal = a.current_balance ?? 0;
                  const displayBal = isLiability ? -bal : bal;
                  return (
                    <div
                      key={a.id}
                      style={{
                        background: "var(--color-paper-card)",
                        border: "1px solid var(--color-rule)",
                        borderRadius: 12,
                        padding: "16px 18px 14px",
                        boxShadow: "var(--shadow-card)",
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                        <div>
                          <div className="serif" style={{ fontSize: 16, color: "var(--color-ink)" }}>{a.name}</div>
                          <div style={{ fontSize: 10, color: "var(--color-ink-3)", textTransform: "capitalize", marginTop: 2, letterSpacing: "0.04em" }}>
                            {a.type} {a.subtype ? `· ${a.subtype.replace(/_/g, " ")}` : ""}
                          </div>
                        </div>
                        {a.mask && (
                          <div className="mono" style={{ fontSize: 11, color: "var(--color-ink-4)" }}>
                            ····{a.mask}
                          </div>
                        )}
                      </div>
                      <div
                        className="mono"
                        style={{
                          fontSize: 22,
                          fontWeight: 500,
                          color: displayBal < 0 ? "var(--color-red)" : "var(--color-ink)",
                        }}
                      >
                        {fmtMoney(displayBal, a.iso_currency_code)}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* ── Recent activity ─────────────────────────────────── */}
            <section id="activity">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 14, paddingBottom: 10, borderBottom: "1px solid var(--color-rule)" }}>
                <h2 className="serif" style={{ fontSize: 24 }}>Recent activity</h2>
                <span style={{ fontSize: 11, color: "var(--color-ink-3)", letterSpacing: "0.08em", textTransform: "uppercase" }}>
                  Last {transactions.length} transactions
                </span>
              </div>

              {transactions.length === 0 ? (
                <p style={{ fontSize: 13, color: "var(--color-ink-4)", padding: "24px 0", textAlign: "center" }}>
                  No transactions yet — they'll appear here after the next sync.
                </p>
              ) : (
                <div
                  style={{
                    background: "var(--color-paper-card)",
                    border: "1px solid var(--color-rule)",
                    borderRadius: 12,
                    overflow: "hidden",
                    boxShadow: "var(--shadow-card)",
                  }}
                >
                  {/* Header row */}
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "90px 1fr 130px 160px 120px",
                      padding: "10px 18px",
                      borderBottom: "1px solid var(--color-rule)",
                      fontSize: 10,
                      fontWeight: 600,
                      letterSpacing: "0.1em",
                      textTransform: "uppercase",
                      color: "var(--color-ink-3)",
                      background: "var(--color-paper-deep)",
                    }}
                  >
                    <div>Date</div>
                    <div>Merchant</div>
                    <div>Category</div>
                    <div>Account</div>
                    <div style={{ textAlign: "right" }}>Amount</div>
                  </div>
                  {transactions.map((tx, idx) => {
                    const acct = accountById.get(tx.account_id);
                    const category = categoryFromPFC(tx.personal_finance_category);
                    const isIncome = tx.amount < 0; // Plaid: positive = outflow
                    return (
                      <div
                        key={tx.id}
                        style={{
                          display: "grid",
                          gridTemplateColumns: "90px 1fr 130px 160px 120px",
                          padding: "12px 18px",
                          borderTop: idx === 0 ? undefined : "1px solid var(--color-rule-soft)",
                          fontSize: 13,
                          alignItems: "center",
                        }}
                      >
                        <div className="mono" style={{ fontSize: 12, color: "var(--color-ink-3)" }}>
                          {fmtTxDate(tx.date)}
                        </div>
                        <div style={{ color: "var(--color-ink)", display: "flex", alignItems: "center", gap: 8 }}>
                          {tx.merchant_name ?? tx.name}
                          {tx.pending && (
                            <span style={{ fontSize: 9, padding: "1px 6px", borderRadius: 3, background: "var(--color-paper-deep)", color: "var(--color-ink-3)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                              Pending
                            </span>
                          )}
                        </div>
                        <div>
                          {category && (
                            <span
                              style={{
                                fontSize: 11,
                                padding: "2px 8px",
                                borderRadius: 12,
                                background: "var(--color-paper-deep)",
                                color: "var(--color-ink-2)",
                                whiteSpace: "nowrap",
                              }}
                            >
                              {category}
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: 11, color: "var(--color-ink-3)" }}>
                          {acct ? `${acct.name.split(" ")[0]} ····${acct.mask ?? ""}` : "—"}
                        </div>
                        <div
                          className="mono"
                          style={{
                            textAlign: "right",
                            color: isIncome ? "var(--color-green)" : "var(--color-ink)",
                            fontWeight: isIncome ? 500 : 400,
                          }}
                        >
                          {isIncome ? "+" : "−"}{fmtMoney(Math.abs(tx.amount))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              <div style={{ marginTop: 20, display: "flex", justifyContent: "center" }}>
                <ConnectSection label="Connect another bank" variant="secondary" />
              </div>
            </section>
          </>
        )}

      </main>

      <footer
        style={{
          maxWidth: 1180,
          margin: "0 auto",
          padding: "24px 28px",
          borderTop: "1px solid var(--color-rule)",
          display: "flex",
          justifyContent: "space-between",
          fontSize: 11,
          color: "var(--color-ink-3)",
        }}
      >
        <span>Secured · TLS · AES-256-GCM · Plaid</span>
        <span>finance.morrisai.family</span>
      </footer>
    </div>
  );
}
