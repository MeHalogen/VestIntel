"use client"

import { Button } from "@/components/ui/button"
import { Bell, User, Settings, Menu } from "lucide-react"
import { CommandBar } from "./command-bar"
import { useMobileMenu } from "./mobile-menu-context"
import { FEATURE_FLAGS } from "@/lib/feature-flags"

export function TopBar() {
  const { toggle } = useMobileMenu()

  return (
    <header className="h-16 border-b border-border/50 px-4 md:px-6 flex items-center justify-between bg-card/30 flex-shrink-0">
      <div className="flex items-center gap-3">
        {/* Hamburger — mobile only */}
        <button
          onClick={toggle}
          className="md:hidden p-2 rounded-lg text-muted-foreground hover:bg-accent"
          aria-label="Open menu"
        >
          <Menu className="w-5 h-5" />
        </button>
        <CommandBar />
      </div>

      <div className="flex items-center gap-2 md:gap-4">
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="w-5 h-5" />
          <span className="absolute top-1 right-1 w-2 h-2 bg-bearish rounded-full" />
        </Button>
        <Button variant="ghost" size="icon" className="hidden sm:inline-flex">
          <Settings className="w-5 h-5" />
        </Button>
        {FEATURE_FLAGS.showUserMenu && (
          <Button variant="ghost" size="icon">
            <User className="w-5 h-5" />
          </Button>
        )}
      </div>
    </header>
  )
}
