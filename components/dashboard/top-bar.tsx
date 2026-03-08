"use client"

import { Button } from "@/components/ui/button"
import { Bell, User, Settings } from "lucide-react"
import { CommandBar } from "./command-bar"

export function TopBar() {
  return (
    <header className="h-16 border-b border-border/50 px-6 flex items-center justify-between bg-card/30">
      <CommandBar />

      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="w-5 h-5" />
          <span className="absolute top-1 right-1 w-2 h-2 bg-bearish rounded-full" />
        </Button>
        <Button variant="ghost" size="icon">
          <Settings className="w-5 h-5" />
        </Button>
        <Button variant="ghost" size="icon">
          <User className="w-5 h-5" />
        </Button>
      </div>
    </header>
  )
}
