// app/page.js
"use client";
import { useEffect, useState } from "react";

export default function Page() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [accountId, setAccountId] = useState("");

  const load = async () => {
    setLoading(true);
    const qs = accountId ? `?accountId=${encodeURIComponent(accountId)}` : "";
    const res = await fetch(`/api/fetch-minimal${qs}`, { cache: "no-store" });
    const json = await res.json();
    if (json.ok) setRows(json.data);
    else alert(json.error || "Failed");
    setLoading(false);
  };

  useEffect(() => { load(); /* initial */ }, []); // eslint-disable-line

  return (
    <main style={{ fontFamily: "system-ui, -apple-system, Segoe UI, Roboto", padding: 24 }}>
      <h1 style={{ marginBottom: 16 }}>OCS — Minimal View</h1>

      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        <input
          value={accountId}
          onChange={(e) => setAccountId(e.target.value)}
          placeholder="Optional accountId (else uses OCS_ACCOUNT_ID)"
          style={{ padding: 8, minWidth: 320 }}
        />
        <button onClick={load} style={{ padding: "8px 12px", borderRadius: 8 }}>
          Refresh
        </button>
      </div>

      {loading ? <div>Loading…</div> : null}

      {!loading && (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ textAlign: "left", borderBottom: "1px solid #333" }}>
                <th style={{ padding: "8px 6px" }}>ICCID</th>
                <th style={{ padding: "8px 6px" }}>lastUsageDate</th>
                <th style={{ padding: "8px 6px" }}>Package Name</th>
                <th style={{ padding: "8px 6px" }}>Package Cost</th>
                <th style={{ padding: "8px 6px" }}>pckdatabyte</th>
                <th style={{ padding: "8px 6px" }}>useddatabyte</th>
                <th style={{ padding: "8px 6px" }}>tsactivationutc</th>
                <th style={{ padding: "8px 6px" }}>tsexpirationutc</th>
                <th style={{ padding: "8px 6px" }}>resellerCost (since 2025-06-01)</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, i) => {
                // If multiple packages, one row per package
                const pkgs = (r.packages && r.packages.length ? r.packages : [null]);
                return pkgs.map((p, j) => (
                  <tr key={`${i}-${j}`} style={{ borderBottom: "1px solid #222" }}>
                    <td style={{ padding: "8px 6px", whiteSpace: "nowrap" }}>{r.iccid}</td>
                    <td style={{ padding: "8px 6px" }}>{r.lastUsageDate || "-"}</td>
                    <td style={{ padding: "8px 6px" }}>{p?.prepaidpackagetemplatename || "-"}</td>
                    <td style={{ padding: "8px 6px" }}>{p?.cost ?? "-"}</td>
                    <td style={{ padding: "8px 6px" }}>{p?.pckdatabyte ?? "-"}</td>
                    <td style={{ padding: "8px 6px" }}>{p?.useddatabyte ?? "-"}</td>
                    <td style={{ padding: "8px 6px" }}>{p?.tsactivationutc ?? "-"}</td>
                    <td style={{ padding: "8px 6px" }}>{p?.tsexpirationutc ?? "-"}</td>
                    <td style={{ padding: "8px 6px" }}>{r.resellerCostSince2025_06_01}</td>
                  </tr>
                ));
              })}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
