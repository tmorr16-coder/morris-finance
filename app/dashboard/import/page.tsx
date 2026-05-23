export const dynamic = "force-dynamic";

import Link from "next/link";
import { requireFinanceAccess } from "@/lib/access";
import PlatformMenu from "@/components/PlatformMenu";
import { createServiceClient } from "@/lib/supabase/server";
import ImportClient from "./_components/ImportClient";
import ManualAccountsList from "./_components/ManualAccountsList";

interface ManualAccount {
  id: string;
  name: string;
  institution: string | null;
  account_type: string;
  balance: number | null;
  as_of_date: string | null;
  currency: string;
  holdings: { name: string; value: number; pct: number | null; shares: number | null; price: number | null }[] | null;
  source: string;
  created_at: string;
}

export default async function ImportPage() {
  const { user, menuUser } = await requireFinanceAccess();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const service = createServiceClient() as any;

  const { data: rows } = await service
    .schema("finance")
    .from("manual_accounts")
    .select("id, name, institution, account_type, balance, as_of_date, currency, holdings, source, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  const accounts = (rows ?? []) as ManualAccount[];

  return (
    <div>
      <PlatformMenu currentApp="finance" user={menuUser} />

      <header style={{ borderBottom: "1px solid var(--color-rule)", background: "var(--color-paper)" }}>
        <div style={{ maxWidth: 1180, margin: "0 auto", padding: "16px 28px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 24 }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
            <span style={{ width: 5, height: 5, borderRadius: "50%", background: "var(--color-bronze)", alignSelf: "center" }} />
            <span className="serif" style={{ fontSize: 22 }}>morrisai</span>
            <span className="serif" style={{ color: "var(--color-bronze-dark)", fontStyle: "italic" }}>.family</span>
            <span style={{ color: "var(--color-ink-3)", fontSize: 12, letterSpacing: "0.04em", textTransform: "uppercase", marginLeft: 14, paddingLeft: 14, borderLeft: "1px solid var(--color-rule)" }}>
              finance · import
            </span>
          </div>
          <Link href="/dashboard" style={{ fontSize: 12, color: "var(--color-ink-3)", textDecoration: "none", padding: "6px 12px", borderRadius: 8, border: "1px solid var(--color-rule)" }}>
            ← Dashboard
          </Link>
        </div>
      </header>

      <main style={{ maxWidth: 880, margin: "0 auto", padding: "32px 28px 80px" }}>
        <section style={{ marginBottom: 32 }}>
          <h1 className="serif" style={{ fontSize: 32, marginBottom: 8 }}>Import statement</h1>
          <p style={{ fontSize: 14, color: "var(--color-ink-3)", lineHeight: 1.55, maxWidth: 560 }}>
            Upload a PDF or CSV account statement from your 401k, HSA, or any account not connectable via Plaid.
            Claude extracts the balance and holdings — the raw file is never stored.
          </p>
        </section>

        <ImportClient userId={user.id} />

        {accounts.length > 0 && (
          <section style={{ marginTop: 40 }}>
            <h2 className="serif" style={{ fontSize: 24, marginBottom: 16 }}>Imported accounts</h2>
            <ManualAccountsList initialAccounts={accounts} />
          </section>
        )}
      </main>
    </div>
  );
}
