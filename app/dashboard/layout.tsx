import { DashboardSidebar } from "@/components/dashboard/sidebar"
import { TopBar } from "@/components/dashboard/top-bar"
import { MobileBottomNav } from "@/components/dashboard/mobile-bottom-nav"
import { MobileMenuProvider } from "@/components/dashboard/mobile-menu-context"
import { KeyboardShortcuts } from "@/components/keyboard-shortcuts"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <MobileMenuProvider>
      <div className="flex h-screen bg-background">
        <KeyboardShortcuts />
        <DashboardSidebar />
        <div className="flex-1 flex flex-col overflow-hidden">
          <TopBar />
          <main className="flex-1 overflow-y-auto p-4 md:p-6 pb-20 md:pb-6">
            {children}
          </main>
        </div>
        <MobileBottomNav />
      </div>
    </MobileMenuProvider>
  )
}
