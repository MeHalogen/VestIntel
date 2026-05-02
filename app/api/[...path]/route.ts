import { NextRequest, NextResponse } from "next/server"

const BACKEND = process.env.BACKEND_URL || "http://localhost:8000"
const USER_EMAIL = process.env.BACKEND_USER_EMAIL || "demo@vestintel.local"

async function proxy(req: NextRequest) {
  const url = new URL(req.url)
  // Forward the full path + query string to the FastAPI backend
  const backendUrl = `${BACKEND}${url.pathname}${url.search}`

  const headers: HeadersInit = {
    "Content-Type": "application/json",
    "X-User-Email": req.headers.get("x-user-email") || USER_EMAIL,
  }

  const init: RequestInit = {
    method: req.method,
    headers,
  }

  if (req.method !== "GET" && req.method !== "HEAD") {
    init.body = await req.text()
  }

  try {
    const res = await fetch(backendUrl, init)
    const data = await res.text()
    return new NextResponse(data, {
      status: res.status,
      headers: { "Content-Type": "application/json" },
    })
  } catch (err) {
    console.error(`[proxy] ${backendUrl}`, err)
    return NextResponse.json({ error: "Backend unreachable" }, { status: 503 })
  }
}

export const GET = proxy
export const POST = proxy
export const PUT = proxy
export const PATCH = proxy
export const DELETE = proxy
