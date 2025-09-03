// app/api/fetch-minimal/route.js
import { NextResponse } from "next/server";
import { fetchMinimalData } from "../../../lib/teltrip";

export const dynamic = "force-dynamic";

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const accountId = searchParams.get("accountId") || undefined;
    const data = await fetchMinimalData({ accountId });
    return NextResponse.json({ ok: true, data });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: String(err?.message || err) },
      { status: 500 }
    );
  }
}
