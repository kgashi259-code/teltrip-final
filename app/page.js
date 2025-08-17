"use client";

import React, { useEffect, useMemo, useState, Fragment } from "react";
import * as XLSX from "xlsx";

async function safeFetch(url) {
  const res = await fetch(url, { cache: "no-store" });
  const txt = await res.text();
  let json = null;
  try {
    json = txt ? JSON.parse(txt) : null;
  } catch {}
  if (!res.ok)
    throw new Error(
      `HTTP ${res.status} ${res.statusText}${txt ? " :: " + txt.slice(0, 300) : ""}`
    );
  return json ?? {};
}

const bytesToGB = (b) =>
  b == null || isNaN(b) ? "" : (Number(b) / 1024 ** 3).toFixed(2);
const money = (n) => (n == null || isNaN(n) ? "" : Number(n).toFixed(2));
const fmtDT = (s) => (typeof s === "string" ? s.replace("T", " ") : s ?? "");

const columns = [
  "iccid",
  "subscriberStatus",
  "activationDate",
  "lastUsageDate",
  "account",
  "prepaidpackagetemplatename",
  "prepaidpackagetemplateid",
  "tsactivationutc",
  "tsexpirationutc",
  "pckdatabyte",
  "useddatabyte",
  "subscriberOneTimeCost",
  "totalBytesSinceJun1",
  "resellerCostSinceJun1"
];

export default function Page() {
  const [accountId, setAccountId] = useState("3771");
  const [rows, setRows] = useState([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [accounts, setAccounts] = useState([]);
  const [accountSearch, setAccountSearch] = useState("");

  const logoSrc = process.env.NEXT_PUBLIC_LOGO_URL || "/logo.png";

  async function loadAccounts() {
    const url = "/api/accounts";
    const r = await fetch(url, { cache: "no-store" });
    const t = await r.text();
    let j = null;
    try {
      j = t ? JSON.parse(t) : null;
    } catch {}
    if (j?.ok && Array.isArray(j.data)) {
      setAccounts(j.data);
      if (!j.data.some((a) => String(a.id) === String(accountId)) && j.data.length) {
        setAccountId(String(j.data[0].id));
      }
    }
  }
  useEffect(() => {
    loadAccounts();
  }, []);

  async function load() {
    setErr("");
    setLoading(true);
    try {
      const url = new URL("/api/fetch-data", window.location.origin);
      if (accountId) url.searchParams.set("accountId", String(accountId).trim());
      const payload = await safeFetch(url.toString());
      if (payload?.ok === false) throw new Error(payload.error || "API error");
      setRows(Array.isArray(payload?.data) ? payload.data : []);
      if (!Array.isArray(payload?.data))
        setErr("No data array. Check env/token/accountId.");
    } catch (e) {
      setRows([]);
      setErr(e.message || "Failed");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    load();
  }, [accountId]);

  const filtered = useMemo(() => {
    const n = q.trim().toLowerCase();
    if (!n) return rows;
    return rows.filter((r) =>
      Object.values(r).some((v) =>
        String(v ?? "").toLowerCase().includes(n)
      )
    );
  }, [rows, q]);

  const totals = useMemo(() => {
    let totalReseller = 0;
    let totalSubscriberOneTime = 0;
    for (const r of rows) {
      if (Number.isFinite(r?.resellerCostSinceJun1))
        totalReseller += Number(r.resellerCostSinceJun1);
      if (Number.isFinite(r?.subscriberOneTimeCost))
        totalSubscriberOneTime += Number(r.subscriberOneTimeCost);
    }
    const pnl = totalSubscriberOneTime - totalReseller;
    return { totalReseller, totalSubscriberOneTime, pnl };
  }, [rows]);

  return (
    <main style={{ padding: 24, maxWidth: 1800, margin: "0 auto" }}>
      <header style={{ display: "flex", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <img src={logoSrc} alt="Teltrip" style={{ height: 48 }} />
          <h1>Teltrip Dashboard</h1>
        </div>
      </header>

      <div style={{ display: "flex", gap: 12, margin: "12px 0" }}>
        <select
          value={String(accountId)}
          onChange={(e) => {
            setAccountId(e.target.value);
          }}
        >
          {accounts
            .filter((a) =>
              (a.name || "").toLowerCase().includes(
                (accountSearch || "").toLowerCase()
              )
            )
            .map((a) => (
              <option key={a.id} value={String(a.id)}>
                {a.name} — {a.id}
              </option>
            ))}
        </select>
        <button onClick={loadAccounts}>Refresh Accounts</button>
        <input
          placeholder="Filter accounts..."
          value={accountSearch}
          onChange={(e) => setAccountSearch(e.target.value)}
        />
      </div>

      <div style={{ marginBottom: 12 }}>
        <b>Totals:</b> Subscriber: €{money(totals.totalSubscriberOneTime)} | Reseller: €{money(totals.totalReseller)} | PNL: €{money(totals.pnl)}
      </div>

      {err && <div style={{ color: "red" }}>{err}</div>}

      <div style={{ overflowX: "auto" }}>
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${columns.length}, 1fr)`, fontWeight: 'bold', background: '#eefecc', padding: 10 }}>
          {columns.map((col) => (
            <div key={col}>{col}</div>
          ))}
        </div>

        {filtered.map((r, i) => (
          <div key={i} style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${columns.length}, 1fr)`,
            gap: 2,
            borderTop: '1px solid #ccc',
            padding: 8,
            background: i % 2 === 0 ? '#f7fcd1' : '#f5fbd7'
          }}>
            {columns.map((col) => (
              <div key={col} style={{ fontSize: 13 }}>
                {col.includes("Cost") ? money(r[col]) : col.includes("Bytes") ? bytesToGB(r[col]) : fmtDT(r[col])}
              </div>
            ))}
          </div>
        ))}
      </div>
    </main>
  );
}
