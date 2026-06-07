"use client";

import { useState } from "react";
import type { RetirementDebt } from "../types";

interface Props {
  debts: RetirementDebt[];
  setDebts: (d: RetirementDebt[]) => void;
}

const LOAN_TYPES = ["mortgage", "auto", "student", "credit_card", "personal", "other"];
const LOAN_TYPE_LABELS: Record<string, string> = {
  mortgage: "Mortgage",
  auto: "Auto",
  student: "Student",
  credit_card: "Credit Card",
  personal: "Personal",
  other: "Other",
};

const EMPTY_LOAN = {
  name: "",
  type: "mortgage",
  balance: "",
  rate_pct: "",
  monthly_payment: "",
};

const EMPTY_LEASE = {
  name: "",
  lease_monthly_payment: "",
  lease_term_months: "",
  lease_months_remaining: "",
  lease_residual: "",
  lease_mileage_allowance: "",
  lease_overage_cpm: "",
  lease_disposition_fee: "",
  lease_end_decision: "return",
};

function fmtMoney(n: number | null | undefined): string {
  if (n == null) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n);
}

function payoffMonths(balance: number, rate_pct: number, monthly_payment: number): string {
  if (monthly_payment <= 0 || balance <= 0) return "—";
  const r = rate_pct / 100 / 12;
  if (r === 0) {
    const months = Math.ceil(balance / monthly_payment);
    return `${Math.floor(months / 12)}y ${months % 12}m`;
  }
  const months = Math.ceil(
    -Math.log(1 - (r * balance) / monthly_payment) / Math.log(1 + r)
  );
  if (!isFinite(months) || months < 0) return "—";
  const y = Math.floor(months / 12);
  const m = months % 12;
  return y > 0 ? `${y}y ${m}m` : `${m}m`;
}

export default function DebtsTab({ debts, setDebts }: Props) {
  const [showForm, setShowForm] = useState(false);
  const [subtype, setSubtype] = useState<"loan" | "lease">("loan");
  const [editId, setEditId] = useState<string | null>(null);
  const [loanForm, setLoanForm] = useState({ ...EMPTY_LOAN });
  const [leaseForm, setLeaseForm] = useState({ ...EMPTY_LEASE });

  const loans = debts.filter((d) => d.subtype === "loan");
  const leases = debts.filter((d) => d.subtype === "lease");

  const totalMonthly = debts.reduce((s, d) => {
    if (d.subtype === "lease") return s + (d.lease_monthly_payment ?? 0);
    return s + (d.monthly_payment ?? 0);
  }, 0);

  function openAdd(st: "loan" | "lease") {
    setEditId(null);
    setSubtype(st);
    setLoanForm({ ...EMPTY_LOAN });
    setLeaseForm({ ...EMPTY_LEASE });
    setShowForm(true);
  }

  function openEdit(d: RetirementDebt) {
    setEditId(d.id);
    if (d.subtype === "loan") {
      setSubtype("loan");
      setLoanForm({
        name: d.name,
        type: d.type,
        balance: d.balance != null ? String(d.balance) : "",
        rate_pct: d.rate_pct != null ? String(d.rate_pct) : "",
        monthly_payment: d.monthly_payment != null ? String(d.monthly_payment) : "",
      });
    } else {
      setSubtype("lease");
      setLeaseForm({
        name: d.name,
        lease_monthly_payment: d.lease_monthly_payment != null ? String(d.lease_monthly_payment) : "",
        lease_term_months: d.lease_term_months != null ? String(d.lease_term_months) : "",
        lease_months_remaining: d.lease_months_remaining != null ? String(d.lease_months_remaining) : "",
        lease_residual: d.lease_residual != null ? String(d.lease_residual) : "",
        lease_mileage_allowance: d.lease_mileage_allowance != null ? String(d.lease_mileage_allowance) : "",
        lease_overage_cpm: d.lease_overage_cpm != null ? String(d.lease_overage_cpm) : "",
        lease_disposition_fee: d.lease_disposition_fee != null ? String(d.lease_disposition_fee) : "",
        lease_end_decision: d.lease_end_decision ?? "return",
      });
    }
    setShowForm(true);
  }

  function handleDelete(id: string) {
    setDebts(debts.filter((d) => d.id !== id));
  }

  function handleSubmitLoan(e: React.FormEvent) {
    e.preventDefault();
    if (editId) {
      setDebts(
        debts.map((d) =>
          d.id === editId
            ? {
                ...d,
                name: loanForm.name,
                type: loanForm.type,
                balance: loanForm.balance !== "" ? parseFloat(loanForm.balance) : null,
                rate_pct: loanForm.rate_pct !== "" ? parseFloat(loanForm.rate_pct) : null,
                monthly_payment: loanForm.monthly_payment !== "" ? parseFloat(loanForm.monthly_payment) : null,
              }
            : d
        )
      );
    } else {
      setDebts([
        ...debts,
        {
          id: crypto.randomUUID(),
          profile_id: "",
          name: loanForm.name,
          subtype: "loan",
          type: loanForm.type,
          balance: loanForm.balance !== "" ? parseFloat(loanForm.balance) : null,
          rate_pct: loanForm.rate_pct !== "" ? parseFloat(loanForm.rate_pct) : null,
          monthly_payment: loanForm.monthly_payment !== "" ? parseFloat(loanForm.monthly_payment) : null,
          lease_monthly_payment: null,
          lease_term_months: null,
          lease_months_remaining: null,
          lease_residual: null,
          lease_mileage_allowance: null,
          lease_overage_cpm: null,
          lease_disposition_fee: null,
          lease_end_decision: null,
          sort_order: debts.length,
          created_at: new Date().toISOString(),
        },
      ]);
    }
    setShowForm(false);
    setEditId(null);
  }

  function handleSubmitLease(e: React.FormEvent) {
    e.preventDefault();
    if (editId) {
      setDebts(
        debts.map((d) =>
          d.id === editId
            ? {
                ...d,
                name: leaseForm.name,
                lease_monthly_payment: leaseForm.lease_monthly_payment !== "" ? parseFloat(leaseForm.lease_monthly_payment) : null,
                lease_term_months: leaseForm.lease_term_months !== "" ? parseInt(leaseForm.lease_term_months) : null,
                lease_months_remaining: leaseForm.lease_months_remaining !== "" ? parseInt(leaseForm.lease_months_remaining) : null,
                lease_residual: leaseForm.lease_residual !== "" ? parseFloat(leaseForm.lease_residual) : null,
                lease_mileage_allowance: leaseForm.lease_mileage_allowance !== "" ? parseInt(leaseForm.lease_mileage_allowance) : null,
                lease_overage_cpm: leaseForm.lease_overage_cpm !== "" ? parseFloat(leaseForm.lease_overage_cpm) : null,
                lease_disposition_fee: leaseForm.lease_disposition_fee !== "" ? parseFloat(leaseForm.lease_disposition_fee) : null,
                lease_end_decision: leaseForm.lease_end_decision || null,
              }
            : d
        )
      );
    } else {
      setDebts([
        ...debts,
        {
          id: crypto.randomUUID(),
          profile_id: "",
          name: leaseForm.name,
          subtype: "lease",
          type: "auto",
          balance: null,
          rate_pct: null,
          monthly_payment: null,
          lease_monthly_payment: leaseForm.lease_monthly_payment !== "" ? parseFloat(leaseForm.lease_monthly_payment) : null,
          lease_term_months: leaseForm.lease_term_months !== "" ? parseInt(leaseForm.lease_term_months) : null,
          lease_months_remaining: leaseForm.lease_months_remaining !== "" ? parseInt(leaseForm.lease_months_remaining) : null,
          lease_residual: leaseForm.lease_residual !== "" ? parseFloat(leaseForm.lease_residual) : null,
          lease_mileage_allowance: leaseForm.lease_mileage_allowance !== "" ? parseInt(leaseForm.lease_mileage_allowance) : null,
          lease_overage_cpm: leaseForm.lease_overage_cpm !== "" ? parseFloat(leaseForm.lease_overage_cpm) : null,
          lease_disposition_fee: leaseForm.lease_disposition_fee !== "" ? parseFloat(leaseForm.lease_disposition_fee) : null,
          lease_end_decision: leaseForm.lease_end_decision || null,
          sort_order: debts.length,
          created_at: new Date().toISOString(),
        },
      ]);
    }
    setShowForm(false);
    setEditId(null);
  }

  return (
    <div>
      {/* Total monthly card */}
      <div
        style={{
          background: "var(--color-paper-card)",
          border: "1px solid var(--color-rule)",
          borderRadius: 12,
          padding: "20px 24px",
          boxShadow: "var(--shadow-card)",
          marginBottom: 24,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div>
          <div
            style={{
              fontSize: 10,
              fontWeight: 600,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: "var(--color-ink-3)",
              marginBottom: 6,
            }}
          >
            Total monthly obligation
          </div>
          <div className="mono" style={{ fontSize: 36, fontWeight: 500, color: "var(--color-ink)" }}>
            {fmtMoney(totalMonthly)}
          </div>
        </div>
        <div style={{ fontSize: 13, color: "var(--color-ink-3)" }}>
          {loans.length} loan{loans.length !== 1 ? "s" : ""} · {leases.length} lease{leases.length !== 1 ? "s" : ""}
        </div>
      </div>

      {/* Loans section */}
      <div style={{ marginBottom: 20 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 12,
          }}
        >
          <div
            style={{
              fontSize: 10,
              fontWeight: 600,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              color: "var(--color-ink-3)",
            }}
          >
            Loans
          </div>
          <button
            onClick={() => openAdd("loan")}
            style={{
              padding: "5px 14px",
              borderRadius: 8,
              border: "1px dashed var(--color-rule)",
              background: "transparent",
              color: "var(--color-ink-2)",
              fontSize: 12,
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            + Add loan
          </button>
        </div>

        {loans.length === 0 && (
          <div style={{ fontSize: 13, color: "var(--color-ink-4)", paddingLeft: 4 }}>No loans added.</div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {loans.map((d) => (
            <div
              key={d.id}
              style={{
                background: "var(--color-paper-card)",
                border: "1px solid var(--color-rule)",
                borderRadius: 10,
                padding: "14px 18px",
                boxShadow: "var(--shadow-card)",
                display: "flex",
                alignItems: "center",
                gap: 14,
              }}
            >
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                  <span className="serif" style={{ fontSize: 16 }}>
                    {d.name}
                  </span>
                  <span
                    style={{
                      fontSize: 9,
                      fontWeight: 600,
                      letterSpacing: "0.06em",
                      textTransform: "uppercase",
                      color: "var(--color-bronze-dark)",
                      background: "rgba(139,106,71,0.1)",
                      padding: "2px 7px",
                      borderRadius: 8,
                    }}
                  >
                    {LOAN_TYPE_LABELS[d.type] ?? d.type}
                  </span>
                </div>
                <div style={{ display: "flex", gap: 14, fontSize: 12, color: "var(--color-ink-3)" }}>
                  {d.balance != null && <span>Balance: {fmtMoney(d.balance)}</span>}
                  {d.rate_pct != null && <span>{d.rate_pct}% APR</span>}
                  {d.balance != null && d.rate_pct != null && d.monthly_payment != null && (
                    <span>Payoff: {payoffMonths(d.balance, d.rate_pct, d.monthly_payment)}</span>
                  )}
                </div>
              </div>
              <div className="mono" style={{ fontSize: 17, fontWeight: 500, color: "var(--color-ink)" }}>
                {fmtMoney(d.monthly_payment)}/mo
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={() => openEdit(d)} style={editBtnStyle}>Edit</button>
                <button onClick={() => handleDelete(d.id)} style={deleteBtnStyle}>Remove</button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Leases section */}
      <div style={{ marginBottom: 20 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 12,
          }}
        >
          <div
            style={{
              fontSize: 10,
              fontWeight: 600,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              color: "var(--color-ink-3)",
            }}
          >
            Leases
          </div>
          <button
            onClick={() => openAdd("lease")}
            style={{
              padding: "5px 14px",
              borderRadius: 8,
              border: "1px dashed var(--color-rule)",
              background: "transparent",
              color: "var(--color-ink-2)",
              fontSize: 12,
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            + Add lease
          </button>
        </div>

        {leases.length === 0 && (
          <div style={{ fontSize: 13, color: "var(--color-ink-4)", paddingLeft: 4 }}>No leases added.</div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {leases.map((d) => (
            <div
              key={d.id}
              style={{
                background: "var(--color-paper-card)",
                border: "1px solid var(--color-rule)",
                borderRadius: 10,
                padding: "14px 18px",
                boxShadow: "var(--shadow-card)",
                display: "flex",
                alignItems: "center",
                gap: 14,
              }}
            >
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                  <span className="serif" style={{ fontSize: 16 }}>
                    {d.name}
                  </span>
                  <span
                    style={{
                      fontSize: 9,
                      fontWeight: 600,
                      letterSpacing: "0.06em",
                      textTransform: "uppercase",
                      color: "var(--color-bronze-dark)",
                      background: "rgba(139,106,71,0.1)",
                      padding: "2px 7px",
                      borderRadius: 8,
                    }}
                  >
                    Lease
                  </span>
                </div>
                <div style={{ display: "flex", gap: 14, fontSize: 12, color: "var(--color-ink-3)", flexWrap: "wrap" }}>
                  {d.lease_months_remaining != null && (
                    <span>{d.lease_months_remaining}mo remaining</span>
                  )}
                  {d.lease_residual != null && <span>Residual: {fmtMoney(d.lease_residual)}</span>}
                  {d.lease_end_decision && (
                    <span style={{ textTransform: "capitalize" }}>
                      At term: {d.lease_end_decision}
                    </span>
                  )}
                </div>
              </div>
              <div className="mono" style={{ fontSize: 17, fontWeight: 500, color: "var(--color-ink)" }}>
                {fmtMoney(d.lease_monthly_payment)}/mo
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={() => openEdit(d)} style={editBtnStyle}>Edit</button>
                <button onClick={() => handleDelete(d.id)} style={deleteBtnStyle}>Remove</button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Forms */}
      {showForm && subtype === "loan" && (
        <form
          onSubmit={handleSubmitLoan}
          style={formStyle}
        >
          <div style={{ fontSize: 14, fontWeight: 600, color: "var(--color-ink)", marginBottom: 16 }}>
            {editId ? "Edit loan" : "Add loan"}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <div>
              <label style={labelStyle}>Name</label>
              <input
                required
                value={loanForm.name}
                onChange={(e) => setLoanForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Home mortgage"
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>Type</label>
              <select
                value={loanForm.type}
                onChange={(e) => setLoanForm((f) => ({ ...f, type: e.target.value }))}
                style={selectStyle}
              >
                {LOAN_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {LOAN_TYPE_LABELS[t] ?? t}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Balance ($)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={loanForm.balance}
                onChange={(e) => setLoanForm((f) => ({ ...f, balance: e.target.value }))}
                placeholder="0"
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>Interest rate (% APR)</label>
              <input
                type="number"
                min="0"
                max="50"
                step="0.001"
                value={loanForm.rate_pct}
                onChange={(e) => setLoanForm((f) => ({ ...f, rate_pct: e.target.value }))}
                placeholder="6.5"
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>Monthly payment ($)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={loanForm.monthly_payment}
                onChange={(e) => setLoanForm((f) => ({ ...f, monthly_payment: e.target.value }))}
                placeholder="0"
                style={inputStyle}
              />
            </div>
          </div>
          {loanForm.balance && loanForm.rate_pct && loanForm.monthly_payment && (
            <div style={{ fontSize: 12, color: "var(--color-ink-3)", marginTop: 10 }}>
              Estimated payoff:{" "}
              {payoffMonths(
                parseFloat(loanForm.balance),
                parseFloat(loanForm.rate_pct),
                parseFloat(loanForm.monthly_payment)
              )}
            </div>
          )}
          <div style={{ display: "flex", gap: 10, marginTop: 18 }}>
            <button type="submit" style={submitBtnStyle}>{editId ? "Save changes" : "Add loan"}</button>
            <button type="button" onClick={() => { setShowForm(false); setEditId(null); }} style={cancelBtnStyle}>Cancel</button>
          </div>
        </form>
      )}

      {showForm && subtype === "lease" && (
        <form
          onSubmit={handleSubmitLease}
          style={formStyle}
        >
          <div style={{ fontSize: 14, fontWeight: 600, color: "var(--color-ink)", marginBottom: 16 }}>
            {editId ? "Edit lease" : "Add lease"}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <div style={{ gridColumn: "1 / -1" }}>
              <label style={labelStyle}>Name</label>
              <input
                required
                value={leaseForm.name}
                onChange={(e) => setLeaseForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Honda Accord lease"
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>Monthly payment ($)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={leaseForm.lease_monthly_payment}
                onChange={(e) => setLeaseForm((f) => ({ ...f, lease_monthly_payment: e.target.value }))}
                placeholder="0"
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>Term (months)</label>
              <input
                type="number"
                min="0"
                value={leaseForm.lease_term_months}
                onChange={(e) => setLeaseForm((f) => ({ ...f, lease_term_months: e.target.value }))}
                placeholder="36"
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>Months remaining</label>
              <input
                type="number"
                min="0"
                value={leaseForm.lease_months_remaining}
                onChange={(e) => setLeaseForm((f) => ({ ...f, lease_months_remaining: e.target.value }))}
                placeholder="0"
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>Residual value ($)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={leaseForm.lease_residual}
                onChange={(e) => setLeaseForm((f) => ({ ...f, lease_residual: e.target.value }))}
                placeholder="0"
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>Annual mileage allowance</label>
              <input
                type="number"
                min="0"
                value={leaseForm.lease_mileage_allowance}
                onChange={(e) => setLeaseForm((f) => ({ ...f, lease_mileage_allowance: e.target.value }))}
                placeholder="12000"
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>Overage cost/mile ($)</label>
              <input
                type="number"
                min="0"
                step="0.0001"
                value={leaseForm.lease_overage_cpm}
                onChange={(e) => setLeaseForm((f) => ({ ...f, lease_overage_cpm: e.target.value }))}
                placeholder="0.25"
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>Disposition fee ($)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={leaseForm.lease_disposition_fee}
                onChange={(e) => setLeaseForm((f) => ({ ...f, lease_disposition_fee: e.target.value }))}
                placeholder="0"
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>At term end</label>
              <select
                value={leaseForm.lease_end_decision}
                onChange={(e) => setLeaseForm((f) => ({ ...f, lease_end_decision: e.target.value }))}
                style={selectStyle}
              >
                <option value="return">Return</option>
                <option value="renew">Renew</option>
                <option value="buy">Buy</option>
              </select>
            </div>
          </div>
          <div style={{ display: "flex", gap: 10, marginTop: 18 }}>
            <button type="submit" style={submitBtnStyle}>{editId ? "Save changes" : "Add lease"}</button>
            <button type="button" onClick={() => { setShowForm(false); setEditId(null); }} style={cancelBtnStyle}>Cancel</button>
          </div>
        </form>
      )}
    </div>
  );
}

const labelStyle: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 600,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color: "var(--color-ink-3)",
  display: "block",
  marginBottom: 6,
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "9px 12px",
  border: "1px solid var(--color-rule)",
  borderRadius: 8,
  background: "var(--color-paper)",
  color: "var(--color-ink)",
  fontSize: 13,
  fontFamily: "inherit",
  outline: "none",
  boxSizing: "border-box",
};

const selectStyle: React.CSSProperties = {
  width: "100%",
  padding: "9px 12px",
  border: "1px solid var(--color-rule)",
  borderRadius: 8,
  background: "var(--color-paper)",
  color: "var(--color-ink)",
  fontSize: 13,
  fontFamily: "inherit",
  outline: "none",
  boxSizing: "border-box",
};

const formStyle: React.CSSProperties = {
  background: "var(--color-paper-card)",
  border: "1px solid var(--color-rule)",
  borderRadius: 12,
  padding: "20px 24px",
  boxShadow: "var(--shadow-card)",
  marginTop: 12,
};

const editBtnStyle: React.CSSProperties = {
  padding: "5px 12px",
  borderRadius: 7,
  border: "1px solid var(--color-rule)",
  background: "var(--color-paper)",
  color: "var(--color-ink-2)",
  fontSize: 12,
  cursor: "pointer",
  fontFamily: "inherit",
};

const deleteBtnStyle: React.CSSProperties = {
  padding: "5px 12px",
  borderRadius: 7,
  border: "1px solid rgba(154,59,42,0.3)",
  background: "rgba(154,59,42,0.05)",
  color: "var(--color-red)",
  fontSize: 12,
  cursor: "pointer",
  fontFamily: "inherit",
};

const submitBtnStyle: React.CSSProperties = {
  padding: "9px 22px",
  borderRadius: 9,
  border: "1px solid var(--color-bronze-dark)",
  background: "var(--color-bronze)",
  color: "#FBF8F1",
  fontSize: 13,
  fontWeight: 500,
  cursor: "pointer",
  fontFamily: "inherit",
};

const cancelBtnStyle: React.CSSProperties = {
  padding: "9px 18px",
  borderRadius: 9,
  border: "1px solid var(--color-rule)",
  background: "transparent",
  color: "var(--color-ink-2)",
  fontSize: 13,
  cursor: "pointer",
  fontFamily: "inherit",
};
