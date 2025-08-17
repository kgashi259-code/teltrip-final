"use client";

import { useEffect, useState } from "react";

export default function Page() {
  const [accountId, setAccountId] = useState("3771");
  const [data, setData] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState(null);

  useEffect(() => {
    fetch("/api/accounts")
      .then((r) => r.json())
      .then((res) => {
        if (res.ok) setAccounts(res.data || []);
      });
  }, []);

  useEffect(() => {
    if (!accountId) return;
    setLoading(true);
    setErr(null);
    fetch(`/api/fetch-data?accountId=${accountId}`)
      .then((r) => r.json())
      .then((res) => {
        if (res.ok) setData(res.data || []);
        else setErr(res.error || "Unknown error");
      })
      .catch((e) => setErr(e.message || "Fetch error"))
      .finally(() => setLoading(false));
  }, [accountId]);

  const totalSubCost = data.reduce((a, r) => a + (r.subscriberOneTimeCost || 0), 0);
  const totalReseller = data.reduce((a, r) => a + (r.resellerCostSinceJun1 || 0), 0);

  return (
    <main style={{ background: "#f3f7dc", padding: 20 }}>
      <div style={{ marginBottom: 12 }}>
        <select
          value={accountId}
          onChange={(e) => setAccountId(e.target.value)}
        >
          {accounts.map((a) => (
            <option key={a.accountId} value={a.accountId}>
              {a.name} — {a.accountId}
            </option>
          ))}
        </select>
        <button onClick={() => setAccountId(accountId)}>Refresh Accounts</button>
      </div>

      <h2>Overview</h2>
      <div style={{ marginBottom: 10 }}>
        <b>Total Subscriber Cost:</b> {totalSubCost.toFixed(2)}   |  
        <b>Total Reseller Cost:</b> {totalReseller.toFixed(2)}   |  
        <b>PNL:</b> {(totalSubCost - totalReseller).toFixed(2)}
      </div>

      {err && (
        <div style={{ background: "#ffefef", border: "1px solid #e5a5a5", color: "#900", padding: "10px 12px", borderRadius: 10, marginBottom: 12, whiteSpace: "pre-wrap", fontSize: 12 }}>
          {err}
        </div>
      )}

      <table style={{ width: "100%", fontSize: 14, background: "#fbfceb" }}>
        <thead>
          <tr>
            <th>iccid</th>
            <th>subscriberStatus</th>
            <th>activationDate</th>
            <th>lastUsageDate</th>
            <th>account</th>
            <th>prepaidpackagetemplatename</th>
            <th>prepaidpackagetemplateid</th>
            <th>tsactivationutc</th>
            <th>tsexpirationutc</th>
            <th>pckdatabyte</th>
            <th>useddatabyte</th>
            <th>subscriberOneTimeCost</th>
            <th>totalBytesSinceJun1</th>
            <th>resellerCostSinceJun1</th>
          </tr>
        </thead>
        <tbody>
          {data.map((r, i) => (
            <tr key={i}>
              <td>{r.iccid}</td>
              <td>{r.subscriberStatus}</td>
              <td>{r.activationDate?.slice(0, 19).replace("T", " ")}</td>
              <td>{r.lastUsageDate?.slice(0, 19).replace("T", " ")}</td>
              <td>{r.account?.name}</td>
              <td>{r.prepaidpackagetemplatename}</td>
              <td>{r.prepaidpackagetemplateid}</td>
              <td>{r.tsactivationutc}</td>
              <td>{r.tsexpirationutc}</td>
              <td>{(r.pckdatabyte / 1e9).toFixed(2)}</td>
              <td>{(r.useddatabyte / 1e9).toFixed(2)}</td>
              <td>{r.subscriberOneTimeCost}</td>
              <td>{(r.totalBytesSinceJun1 / 1e9).toFixed(2)}</td>
              <td>{r.resellerCostSinceJun1}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div style={{ fontSize: 12, marginTop: 12 }}>
        Costs: package one-time from template; reseller cost aggregated since <b>{RANGE_START_YMD}</b>. PNL = Subscriber One-Time − Reseller Cost.
      </div>
    </main>
  );
}
