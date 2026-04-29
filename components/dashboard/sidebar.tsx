"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { TrendingUp, LayoutDashboard, TrendingUpIcon, Briefcase, Bell, Brain, Settings, Target, Newspaper, Sparkles, LineChart, ShieldAlert, Zap, Search } from "lucide-react"
import { cn } from "@/lib/utils"

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Markets", href: "/dashboard/markets", icon: TrendingUpIcon },
  { name: "Market Pulse", href: "/dashboard/pulse", icon: Zap },
  { name: "Opportunities", href: "/dashboard/opportunities", icon: Search },
  { name: "Stocks", href: "/dashboard/stocks", icon: LineChart },
  { name: "Portfolio", href: "/dashboard/portfolio", icon: Briefcase },
  { name: "Risk Engine", href: "/dashboard/risk", icon: ShieldAlert },
  { name: "Widgets", href: "/dashboard/widgets", icon: Brain },
  { name: "Signals", href: "/dashboard/signals", icon: Target },
  { name: "News Intelligence", href: "/dashboard/news", icon: Newspaper },
  { name: "AI Copilot", href: "/dashboard/copilot", icon: Sparkles },
  { name: "Alerts", href: "/dashboard/alerts", icon: Bell },
  { name: "Settings", href: "/dashboard/settings", icon: Settings },
]

export function DashboardSidebar() {
  const pathname = usePathname()

  return (
    <aside className="w-64 border-r border-border/50 bg-card/30 p-6">
      <Link href="/" className="flex items-center gap-2 mb-8">
        <TrendingUp className="w-8 h-8 text-primary" />
        <span className="text-2xl font-bold">VestIntel</span>
      </Link>

      <nav className="space-y-2">
        {navigation.map((item) => {
          const isActive = pathname === item.href || pathname?.startsWith(item.href + "/")
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-lg transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              )}
            >
              <item.icon className="w-5 h-5" />
              <span>{item.name}</span>
            </Link>
          )
        })}
      </nav>
    </aside>
  )
}
