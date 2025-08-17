// app/page.js
"use client";

import React, { useEffect, useMemo, useState, Fragment } from "react";
import * as XLSX from "xlsx";

// safe fetch
async function safeFetch(url) {
  const res = await fetch(url, { cache: "no-store" });
  const txt = await res.text();
  let json = null; try { json = txt ? JSON.parse(txt) : null; } catch {}
  if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}${txt ? " :: " + txt.slice(0,300) : ""}`);
  return json ?? {};
}

// utils
const bytesToGB = (b) => (b == null || isNaN(b)) ? "" : (Number(b) / (1024 ** 3)).toFixed(2);
const money = (n) => (n == null || isNaN(n)) ? "" : Number(n).toFixed(2);
const fmtDT = (s) => typeof s === "string" ? s.replace("T", " ") : s ?? "";

// columns
const columns = [
  "ICCID","IMSI","phoneNumber","subscriberStatus","simStatus","esim","activationCode",
  "activationDate","lastUsageDate","prepaid","balance","account","reseller","lastMcc","lastMnc",
  "prepaidpackagetemplatename","prepaidpackagetemplateid","tsactivationutc","tsexpirationutc","pckdatabyte","useddatabyte","pckdata(GB)","used(GB)",
  "subscriberOneTimeCost","usageSinceJun1(GB)","resellerCostSinceJun1"
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

  // load accounts (listResellerAccount → flattened in API)
  async function loadAccounts() {
    const url = "/api/accounts";
    const r = await fetch(url, { cache: "no-store" });
    const t = await r.text(); let j=null; try{ j=t?JSON.parse(t):null; }catch{}
    if (j?.ok && Array.isArray(j.data)) {
      setAccounts(j.data);
      if (!j.data.some(a => String(a.id) === String(accountId)) && j.data.length) {
        setAccountId(String(j.data[0].id));
      }
    }
  }
  useEffect(() => { loadAccounts(); }, []);

  // load data for selected account
  async function load() {
    setErr(""); setLoading(true);
    try {
      const url = new URL("/api/fetch-data", window.location.origin);
      if (accountId) url.searchParams.set("accountId", String(accountId).trim());
      const payload = await safeFetch(url.toString());
      if (payload?.ok === false) throw new Error(payload.error || "API error");
      setRows(Array.isArray(payload?.data) ? payload.data : []);
      if (!Array.isArray(payload?.data)) setErr("No data array. Check env/token/accountId.");
    } catch (e) {
      setRows([]); setErr(e.message || "Failed");
    } finally { setLoading(false); }
  }
  useEffect(() => { load(); }, [accountId]); // reload when account changes

  // filter rows
  const filtered = useMemo(() => {
    const n = q.trim().toLowerCase();
    if (!n) return rows;
    return rows.filter(r => Object.values(r).some(v => String(v ?? "").toLowerCase().includes(n)));
  }, [rows, q]);

  // totals (current account) + PNL
  const totals = useMemo(() => {
    let totalReseller = 0;
    let totalSubscriberOneTime = 0;
    for (const r of rows) {
      if (Number.isFinite(r?.resellerCostSinceJun1)) totalReseller += Number(r.resellerCostSinceJun1);
      if (Number.isFinite(r?.subscriberOneTimeCost)) totalSubscriberOneTime += Number(r.subscriberOneTimeCost);
    }
    const pnl = totalSubscriberOneTime - totalReseller;
    return { totalReseller, totalSubscriberOneTime, pnl };
  }, [rows]);

  // export buttons
  function exportCSV() {
    const headers = [...columns];
    const lines = [headers.join(",")];
    filtered.forEach(r => {
      lines.push([
        r.iccid ?? "", r.imsi ?? "", r.phoneNumber ?? "", r.subscriberStatus ?? "", r.simStatus ?? "", String(r.esim ?? ""),
        r.activationCode ?? "", fmtDT(r.activationDate), fmtDT(r.lastUsageDate), String(r.prepaid ?? ""), r.balance ?? "",
        r.account ?? "", r.reseller ?? "", r.lastMcc ?? "", r.lastMnc ?? "",
        r.prepaidpackagetemplatename ?? "", r.prepaidpackagetemplateid ?? "", fmtDT(r.tsactivationutc), fmtDT(r.tsexpirationutc),
        r.pckdatabyte ?? "", r.useddatabyte ?? "", bytesToGB(r.pckdatabyte), bytesToGB(r.useddatabyte),
        money(r.subscriberOneTimeCost), bytesToGB(r.totalBytesSinceJun1), money(r.resellerCostSinceJun1)
      ].map(x => `"${String(x).replace(/"/g, '""')}"`).join(","));
    });
    const blob = new Blob([lines.join("
")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob); const a = document.createElement("a");
    a.href = url; a.download = `teltrip_dashboard_${new Date().toISOString().slice(0,10)}.csv`; a.click(); URL.revokeObjectURL(url);
  }

  function exportExcel() {
    const data = filtered.map(r => ({
      ICCID: r.iccid ?? "",
      IMSI: r.imsi ?? "",
      phoneNumber: r.phoneNumber ?? "",
      subscriberStatus: r.subscriberStatus ?? "",
      simStatus: r.simStatus ?? "",
      esim: String(r.esim ?? ""),
      activationCode: r.activationCode ?? "",
      activationDate: fmtDT(r.activationDate),
      lastUsageDate: fmtDT(r.lastUsageDate),
      prepaid: String(r.prepaid ?? ""),
      balance: r.balance ?? "",
      account: r.account ?? "",
      reseller: r.reseller ?? "",
      lastMcc: r.lastMcc ?? "",
      lastMnc: r.lastMnc ?? "",
      prepaidpackagetemplatename: r.prepaidpackagetemplatename ?? "",
      prepaidpackagetemplateid: r.prepaidpackagetemplateid ?? "",
      tsactivationutc: fmtDT(r.tsactivationutc),
      tsexpirationutc: fmtDT(r.tsexpirationutc),
      pckdatabyte: r.pckdatabyte ?? "",
      useddatabyte: r.useddatabyte ?? "",
      "pckdata(GB)": bytesToGB(r.pckdatabyte),
      "used(GB)": bytesToGB(r.useddatabyte),
      subscriberOneTimeCost: money(r.subscriberOneTimeCost),
      "usageSinceJun1(GB)": bytesToGB(r.totalBytesSinceJun1),
      resellerCostSinceJun1: money(r.resellerCostSinceJun1)
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Teltrip");
    XLSX.writeFile(wb, `teltrip_dashboard_${new Date().toISOString().slice(0,10)}.xlsx`);
  }

  return <main>Dashboard Placeholder</main>;
}
