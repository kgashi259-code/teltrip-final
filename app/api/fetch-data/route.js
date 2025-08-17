// app/api/fetch-data/route.js
import { NextResponse } from "next/server";
import { fetchAllData } from "../../../lib/teltrip";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60; // Safe max duration for Hobby plan

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const accountId = searchParams.get("accountId") || undefined;
    const data = await fetchAllData(accountId);
    return NextResponse.json({ ok: true, data });
  } catch (e) {
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }
}
