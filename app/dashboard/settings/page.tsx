export const dynamic = "force-dynamic";

import Link from "next/link";
import { createServiceClient } from "@/lib/supabase/server";
import { requireFinanceAccess } from "@/lib/access";
import PlatformMenu from "@/components/PlatformMenu";
import SettingsClient, { type AccountRow } from "./_components/SettingsClient";
import PinSettings from "./_components/PinSettings";

export default async function SettingsPage() {
  const { user, menuUser } = await requireFinanceAccess();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const service = createServiceClient() as any;

  const { data: prefs } = await service
    .schema("hub")
    .from("preferences")
    .select("finance_pin")
    .eq("user_id", user.id)
    .maybeSingle();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const currentPin: string | null = (prefs as any)?.finance_pin ?? null;

  const { data: itemRows } = await service
    .schema("finance")
    .from("plaid_items")
    .select("id, institution_name")
    .eq("user_id", user.id)
    .order("institution_name", { ascending: true });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const itemIds = ((itemRows as any[]) ?? []).map((r) => r.id);

  let accounts: AccountRow[] = [];
  if (itemIds.length > 0) {
    const { data: acctRows } = await service
      .schema("finance")
      .from("accounts")
      .select("id, item_id, name, official_name, type, subtype, mask, current_balance, is_hidden")
      .in("item_id", itemIds)
      .order("type", { ascending: true })
      .order("name", { ascending: true });
    accounts = (acctRows ?? []) as AccountRow[];
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const itemMap = new Map<string, string>(((itemRows as any[]) ?? []).map((r) => [r.id, r.institution_name]));

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
              finance · settings
            </span>
          </div>
          <Link
            href="/dashboard"
            style={{ fontSize: 12, color: "var(--color-ink-3)", textDecoration: "none", padding: "6px 12px", borderRadius: 8, border: "1px solid var(--color-rule)" }}
          >
            ← Dashboard
          </Link>
        </div>
      </header>

      <main style={{ maxWidth: 880, margin: "0 auto", padding: "32px 28px 80px" }}>
        <section style={{ marginBottom: 32 }}>
          <h1 className="serif" style={{ fontSize: 32, marginBottom: 8 }}>Settings</h1>
          <p style={{ fontSize: 14, color: "var(--color-ink-3)", lineHeight: 1.55 }}>
            Toggle accounts off to exclude them from your dashboard, insights, and recurring detection.
            They stay connected to Plaid — sync continues — but they won&apos;t show in totals.
          </p>
        </section>

        <div style={{ marginBottom: 32, background: "var(--color-paper-card)", border: "1px solid var(--color-rule)", borderRadius: 12, padding: "22px 26px", boxShadow: "var(--shadow-card)" }}>
          <PinSettings currentPin={currentPin} />
        </div>

        <SettingsClient initialAccounts={accounts} itemNameById={Object.fromEntries(itemMap)} />
      </main>
    </div>
  );
}
