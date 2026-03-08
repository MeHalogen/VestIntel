"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

export function KeyboardShortcuts() {
  const router = useRouter()

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Command/Ctrl + K for global search
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault()
        // Focus search bar
        const searchInput = document.querySelector('input[placeholder*="Search"]') as HTMLInputElement
        if (searchInput) searchInput.focus()
      }

      // Command/Ctrl + D for Dashboard
      if ((e.metaKey || e.ctrlKey) && e.key === "d") {
        e.preventDefault()
        router.push("/dashboard")
      }

      // Command/Ctrl + M for Markets
      if ((e.metaKey || e.ctrlKey) && e.key === "m") {
        e.preventDefault()
        router.push("/dashboard/markets")
      }

      // Command/Ctrl + P for Portfolio
      if ((e.metaKey || e.ctrlKey) && e.key === "p") {
        e.preventDefault()
        router.push("/dashboard/portfolio")
      }

      // Command/Ctrl + I for AI Copilot
      if ((e.metaKey || e.ctrlKey) && e.key === "i") {
        e.preventDefault()
        router.push("/dashboard/copilot")
      }

      // Command/Ctrl + / for shortcuts help
      if ((e.metaKey || e.ctrlKey) && e.key === "/") {
        e.preventDefault()
        // Show shortcuts modal
        console.log("Keyboard shortcuts help")
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [router])

  return null
}
