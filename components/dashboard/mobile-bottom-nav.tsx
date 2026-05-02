"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { LayoutDashboard, TrendingUpIcon, Briefcase, Sparkles, LineChart } from "lucide-react"
import { cn } from "@/lib/utils"

const tabs = [
  { name: "Home",      href: "/dashboard",           icon: LayoutDashboard },
  { name: "Markets",   href: "/dashboard/markets",   icon: TrendingUpIcon },
  { name: "Stocks",    href: "/dashboard/stocks",    icon: LineChart },
  { name: "Portfolio", href: "/dashboard/portfolio", icon: Briefcase },
  { name: "Copilot",   href: "/dashboard/copilot",   icon: Sparkles },
]

export function MobileBottomNav() {
  const pathname = usePathname()

  return (
    <nav
      className="fixed bottom-0 inset-x-0 z-30 md:hidden border-t border-border/50 bg-card/95 backdrop-blur-sm"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="flex items-center justify-around h-14">
        {tabs.map((tab) => {
          const isActive = pathname === tab.href || pathname?.startsWith(tab.href + "/")
          return (
            <Link
              key={tab.name}
              href={tab.href}
              className={cn(
                "flex flex-col items-center justify-center gap-0.5 w-full h-full text-[10px] font-medium transition-colors",
                isActive ? "text-primary" : "text-muted-foreground"
              )}
            >
              <tab.icon className={cn("w-5 h-5", isActive && "stroke-[2.5px]")} />
              <span>{tab.name}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
