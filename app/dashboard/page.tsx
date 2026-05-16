export const dynamic = "force-dynamic";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import SignOutButton from "./_components/SignOutButton";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/");

  const name = user.user_metadata?.full_name ?? user.user_metadata?.name ?? user.email ?? "there";

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
          <span
            style={{
              width: 5,
              height: 5,
              borderRadius: "50%",
              background: "var(--color-bronze)",
              display: "inline-block",
              alignSelf: "center",
            }}
          />
          <span className="serif" style={{ fontSize: 22 }}>finance</span>
          <span
            style={{
              color: "var(--color-ink-3)",
              fontSize: 12,
              letterSpacing: "0.04em",
              textTransform: "uppercase",
              marginLeft: 14,
              paddingLeft: 14,
              borderLeft: "1px solid var(--color-rule)",
            }}
          >
            morrisai.family
          </span>
        </div>
        <SignOutButton />
      </header>

      {/* Greeting */}
      <div style={{ marginBottom: 36 }}>
        <div
          style={{
            fontSize: 10,
            fontWeight: 500,
            letterSpacing: "0.16em",
            textTransform: "uppercase",
            color: "var(--color-ink-3)",
            marginBottom: 8,
          }}
        >
          {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
        </div>
        <h1 className="serif" style={{ fontSize: 36, lineHeight: 1.1 }}>
          Welcome, {name.split(" ")[0]}.
        </h1>
      </div>

      {/* Empty state — no banks connected yet */}
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
        <div
          style={{
            width: 48,
            height: 48,
            borderRadius: 12,
            background: "var(--color-paper-deep)",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 18,
            fontSize: 22,
            color: "var(--color-bronze-dark)",
          }}
        >
          ◐
        </div>
        <h2 className="serif" style={{ fontSize: 22, marginBottom: 8 }}>
          No accounts connected yet
        </h2>
        <p style={{ fontSize: 14, color: "var(--color-ink-3)", maxWidth: 320, margin: "0 auto 24px", lineHeight: 1.6 }}>
          Connect your first bank to start importing transactions and balances. Your access tokens are encrypted before storage.
        </p>
        <button
          disabled
          style={{
            padding: "10px 20px",
            borderRadius: 8,
            border: "1px solid var(--color-rule)",
            background: "var(--color-paper-deep)",
            color: "var(--color-ink-3)",
            fontSize: 14,
            fontFamily: "inherit",
            cursor: "not-allowed",
          }}
        >
          Connect a bank — coming next phase
        </button>
      </div>

    </div>
  );
}
