import { NextResponse } from "next/server"

const BACKEND = process.env.BACKEND_URL || "http://localhost:8000"
const USER_EMAIL = process.env.BACKEND_USER_EMAIL || "demo@vestintel.local"

export async function GET() {
  try {
    const res = await fetch(`${BACKEND}/api/markets/india`, {
      headers: {
        "Content-Type": "application/json",
        "X-User-Email": USER_EMAIL,
      },
      next: { revalidate: 30 },
    })

    if (!res.ok) {
      return NextResponse.json({ error: "Backend error" }, { status: res.status })
    }

    const data = await res.json()

    // Remap backend shape (price/change_percent) to client shape (value/change)
    const indices = (data.indices || []).map((idx: {
      symbol: string
      price?: number
      change_percent?: number
    }) => ({
      symbol: idx.symbol,
      name: idx.symbol,
      region: "IN",
      value: idx.price ?? null,
      change: idx.change_percent ?? 0,
      change_percent: idx.change_percent ?? 0,
      source: data.source,
      as_of: data.as_of,
    }))

    return NextResponse.json({ ...data, indices })
  } catch (err) {
    console.error("[api/markets/india]", err)
    return NextResponse.json({ error: "Failed to fetch" }, { status: 500 })
  }
}
