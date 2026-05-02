"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { TrendingUp, LayoutDashboard, TrendingUpIcon, Briefcase, Bell, Brain, Settings, Target, Newspaper, Sparkles, LineChart, ShieldAlert, Zap, Search, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { useMobileMenu } from "./mobile-menu-context"

const navigation = [
  { name: "Dashboard",        href: "/dashboard",              icon: LayoutDashboard },
  { name: "Markets",          href: "/dashboard/markets",      icon: TrendingUpIcon },
  { name: "Market Pulse",     href: "/dashboard/pulse",        icon: Zap },
  { name: "Opportunities",    href: "/dashboard/opportunities", icon: Search },
  { name: "Stocks",           href: "/dashboard/stocks",       icon: LineChart },
  { name: "Portfolio",        href: "/dashboard/portfolio",    icon: Briefcase },
  { name: "Risk Engine",      href: "/dashboard/risk",         icon: ShieldAlert },
  { name: "Widgets",          href: "/dashboard/widgets",      icon: Brain },
  { name: "Signals",          href: "/dashboard/signals",      icon: Target },
  { name: "News Intelligence", href: "/dashboard/news",        icon: Newspaper },
  { name: "AI Copilot",       href: "/dashboard/copilot",      icon: Sparkles },
  { name: "Alerts",           href: "/dashboard/alerts",       icon: Bell },
  { name: "Settings",         href: "/dashboard/settings",     icon: Settings },
]

function SidebarContent({ onLinkClick }: { onLinkClick?: () => void }) {
  const pathname = usePathname()
  return (
    <>
      <Link href="/" className="flex items-center gap-2 mb-8" onClick={onLinkClick}>
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
              onClick={onLinkClick}
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
    </>
  )
}

export function DashboardSidebar() {
  const { isOpen, close } = useMobileMenu()

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:block w-64 border-r border-border/50 bg-card/30 p-6 overflow-y-auto flex-shrink-0">
        <SidebarContent />
      </aside>

      {/* Mobile drawer backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 md:hidden"
          onClick={close}
          aria-hidden="true"
        />
      )}

      {/* Mobile drawer */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-72 bg-card border-r border-border/50 p-6 overflow-y-auto transition-transform duration-300 md:hidden",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <button
          onClick={close}
          className="absolute top-4 right-4 p-2 rounded-lg text-muted-foreground hover:bg-accent"
          aria-label="Close menu"
        >
          <X className="w-5 h-5" />
        </button>
        <SidebarContent onLinkClick={close} />
      </aside>
    </>
  )
}
