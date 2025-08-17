// ✅ app/page.js
import { fetchAllData } from "@/lib/teltrip";

export default async function Page() {
  const rows = await fetchAllData();

  return (
    <div className="p-6">
      <h1 className="text-xl font-bold mb-4">Teltrip Dashboard</h1>
      {rows.length === 0 ? (
        <div>No data</div>
      ) : (
        <table className="w-full border text-sm">
          <thead className="bg-gray-100">
            <tr>
              <th>ICCID</th>
              <th>Package</th>
              <th>Activation</th>
              <th>Expiration</th>
              <th>Data (GB)</th>
              <th>Used (GB)</th>
              <th>One-Time Cost</th>
              <th>Reseller Cost</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className="border-t">
                <td>{r.iccid}</td>
                <td>{r.prepaidpackagetemplatename}</td>
                <td>{r.tsactivationutc}</td>
                <td>{r.tsexpirationutc}</td>
                <td>{r.pckdatabyte ? (r.pckdatabyte / (1024 ** 3)).toFixed(2) : "-"}</td>
                <td>{r.useddatabyte ? (r.useddatabyte / (1024 ** 3)).toFixed(2) : "-"}</td>
                <td>{r.subscriberOneTimeCost ?? "-"}</td>
                <td>{r.resellerCostSinceJun1 ?? "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
