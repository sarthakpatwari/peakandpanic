import { NextResponse } from "next/server";
import { collectQuotes } from "@/lib/quotes";

export async function GET() {
  try {
    const { data, providerErrors } = await collectQuotes();
    return NextResponse.json(
      { data, ...(Object.keys(providerErrors).length ? { providerErrors } : {}), timestamp: Date.now() },
      { headers: { "Cache-Control": "s-maxage=30, stale-while-revalidate=30" } },
    );
  } catch {
    return NextResponse.json({ error: "quotes unavailable" }, { status: 502 });
  }
}
