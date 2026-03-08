"use client"

export type ApiRequestOptions = RequestInit & {
  userEmail?: string
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"
const DEV_USER_EMAIL = process.env.NEXT_PUBLIC_DEV_USER_EMAIL || "demo@vestintel.local"

export function getApiUserEmail(override?: string): string {
  return (override || DEV_USER_EMAIL).trim().toLowerCase()
}

export async function apiRequest<T>(path: string, options: ApiRequestOptions = {}): Promise<T> {
  const { userEmail, headers, ...rest } = options
  const mergedHeaders: HeadersInit = {
    "Content-Type": "application/json",
    "X-User-Email": getApiUserEmail(userEmail),
    ...(headers || {}),
  }

  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...rest,
    headers: mergedHeaders,
    cache: "no-store",
  })

  if (!res.ok) {
    let detail = `${res.status} ${res.statusText}`
    try {
      const body = await res.json()
      detail = body?.detail || body?.message || detail
    } catch {
      // no-op
    }
    throw new Error(`API error for ${path}: ${detail}`)
  }

  return (await res.json()) as T
}

