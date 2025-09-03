// lib/teltrip.js
// Minimal data layer: only the fields Korab requested.

const BASE = process.env.OCS_BASE_URL; // e.g. https://ocs-api.esimvault.cloud/v1
const TOKEN = process.env.OCS_TOKEN;

/** Basic POST helper (same pattern you already use) */
async function ocsPost(payload) {
  if (!BASE || !TOKEN) throw new Error("Missing OCS base URL or token");
  const url = `${BASE}?token=${encodeURIComponent(TOKEN)}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
    cache: "no-store",
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`OCS HTTP ${res.status} :: ${text}`);
  }
  return res.json();
}

/** List subscribers for an account — used to enumerate ICCIDs and subscriberIds */
export async function listSubscribersByAccount(accountId) {
  const body = { listSubscriber: { accountId: Number(accountId) } };
  const json = await ocsPost(body);
  const arr = json?.listSubscriber?.subscriberList || [];
  return arr.map((s) => {
    const iccid = s?.imsiList?.[0]?.iccid || null;
    return {
      subscriberId: s?.subscriberId ?? s?.imsiList?.[0]?.subscriberId ?? null,
      iccid,
    };
  }).filter(x => x.iccid && x.subscriberId);
}

/** For a single ICCID, get lastUsageDate (and confirm ICCID) */
export async function getSingleSubscriberBasic(iccid) {
  const body = { getSingleSubscriber: { iccid: String(iccid), withSimInfo: true, onlySubsInfo: true } };
  const json = await ocsPost(body);
  const sub = json?.listSubscriber?.subscriberList?.[0];
  return {
    iccid: iccid,
    lastUsageDate: sub?.lastUsageDate ?? null,
  };
}

/** All prepaid packages for a subscriberId (we'll pick only requested fields) */
export async function listSubscriberPrepaidPackagesMinimal(subscriberId) {
  const body = { listSubscriberPrepaidPackages: { subscriberId: Number(subscriberId) } };
  const json = await ocsPost(body);
  const pkgs = json?.listSubscriberPrepaidPackages?.packages || [];
  return pkgs.map((p) => ({
    templateId: p?.templateId ?? p?.packageTemplate?.prepaidpackagetemplateid ?? null,
    prepaidpackagetemplatename: p?.packageTemplate?.prepaidpackagetemplatename ?? null,
    pckdatabyte: p?.pckdatabyte ?? null,
    useddatabyte: p?.useddatabyte ?? null,
    tsactivationutc: p?.tsactivationutc ?? null,
    tsexpirationutc: p?.tsexpirationutc ?? null,
  }));
}

/** Fetch template cost + canonical name via listPrepaidPackageTemplate by templateId (if needed) */
export async function getTemplateCostAndName(templateId) {
  if (!templateId) return { cost: null, prepaidpackagetemplatename: null };
  const body = { listPrepaidPackageTemplate: { templateId: Number(templateId) } };
  const json = await ocsPost(body);
  const item =
    json?.listPrepaidPackageTemplate?.template?.[0] ||
    json?.listPrepaidPackageTemplate?.template ||
    null;
  return {
    cost: item?.cost ?? null,
    prepaidpackagetemplatename:
      item?.prepaidpackagetemplatename ?? item?.userUiName ?? null,
  };
}

/** Build weekly periods from 2025-06-01 (inclusive) to today (inclusive) */
function buildWeeklyRanges() {
  const out = [];
  const start = new Date("2025-06-01T00:00:00Z");
  const today = new Date();
  let curStart = new Date(start);
  while (curStart <= today) {
    const curEnd = new Date(curStart);
    curEnd.setUTCDate(curEnd.getUTCDate() + 6); // 7-day window (inclusive)
    if (curEnd > today) curEnd.setTime(today.getTime());
    // use yyyy-mm-dd (UTC) per API examples
    const toISO = (d) => d.toISOString().slice(0, 10);
    out.push({ start: toISO(curStart), end: toISO(curEnd) });
    // next week
    const next = new Date(curStart);
    next.setUTCDate(next.getUTCDate() + 7);
    curStart = next;
  }
  return out;
}

/** Sum resellerCost across all weekly windows for a given subscriberId */
export async function sumWeeklyResellerCostSinceJune1(subscriberId) {
  const ranges = buildWeeklyRanges();
  // The API limits one request period to max 1 week; we loop the weeks and sum totals.
  const chunks = await Promise.all(
    ranges.map(async ({ start, end }) => {
      const body = {
        subscriberUsageOverPeriod: {
          subscriber: { subscriberId: Number(subscriberId) },
          period: { start, end },
        },
      };
      try {
        const json = await ocsPost(body);
        return json?.subscriberUsageOverPeriod?.total?.resellerCost ?? 0;
      } catch {
        return 0; // be resilient: if a week fails or has no usage, count as 0
      }
    })
  );
  const sum = chunks.reduce((a, b) => a + (Number.isFinite(b) ? b : 0), 0);
  return Number(Number(sum).toFixed(6)); // keep it tidy
}

/** Main fetcher returning only the requested fields */
export async function fetchMinimalData({ accountId }) {
  const acc = accountId ?? process.env.OCS_ACCOUNT_ID;
  if (!acc) throw new Error("Provide accountId (env OCS_ACCOUNT_ID or ?accountId=)");

  const subs = await listSubscribersByAccount(acc);

  // Pull data per subscriber (parallel but controlled)
  const results = await Promise.all(
    subs.map(async ({ subscriberId, iccid }) => {
      const [basic, pkgs, weeklyCost] = await Promise.all([
        getSingleSubscriberBasic(iccid),
        listSubscriberPrepaidPackagesMinimal(subscriberId),
        sumWeeklyResellerCostSinceJune1(subscriberId),
      ]);

      // For each package, enrich cost/name from template (if name missing or you prefer canonical)
      const enrichedPkgs = await Promise.all(
        pkgs.map(async (p) => {
          // If template name missing or you want authoritative cost, ask the template endpoint
          const tpl = await getTemplateCostAndName(p.templateId);
          return {
            prepaidpackagetemplatename:
              tpl.prepaidpackagetemplatename ?? p.prepaidpackagetemplatename,
            cost: tpl.cost,
            pckdatabyte: p.pckdatabyte,
            useddatabyte: p.useddatabyte,
            tsactivationutc: p.tsactivationutc,
            tsexpirationutc: p.tsexpirationutc,
          };
        })
      );

      return {
        iccid,
        lastUsageDate: basic.lastUsageDate,
        packages: enrichedPkgs,
        resellerCostSince2025_06_01: weeklyCost,
      };
    })
  );

  return results;
}
