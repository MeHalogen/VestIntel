"use client"

import { cn } from "@/lib/utils"

interface DataSourceBadgeProps {
  source?: string | null
  asOf?: string | null
  className?: string
  /** Layout direction — "row" (default) or "column" */
  direction?: "row" | "column"
}

/**
 * Small muted metadata footer shown under any live-data widget.
 * Renders nothing if both source and asOf are absent.
 */
export function DataSourceBadge({
  source,
  asOf,
  className,
  direction = "row",
}: DataSourceBadgeProps) {
  const formattedTime = asOf
    ? (() => {
        try {
          return new Date(asOf).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
          })
        } catch {
          return asOf
        }
      })()
    : null

  const sourceLabel = source
    ? source.replace("nse_worker", "NSE").replace("nse", "NSE").replace("derived", "Derived").replace("openai", "OpenAI")
    : null

  if (!sourceLabel && !formattedTime) return null

  return (
    <div
      className={cn(
        "flex items-center gap-1.5 text-[11px] text-muted-foreground/60 select-none",
        direction === "column" ? "flex-col items-start gap-0.5" : "flex-row flex-wrap",
        className
      )}
    >
      {sourceLabel && (
        <>
          <span className="font-medium text-muted-foreground/70">Source:</span>
          <span>{sourceLabel}</span>
        </>
      )}
      {sourceLabel && formattedTime && (
        <span className="opacity-40">|</span>
      )}
      {formattedTime && (
        <>
          <span className="font-medium text-muted-foreground/70">Updated:</span>
          <span>{formattedTime}</span>
        </>
      )}
    </div>
  )
}
