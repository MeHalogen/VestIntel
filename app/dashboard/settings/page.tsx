import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { 
  User, 
  Bell, 
  Shield, 
  CreditCard, 
  Moon, 
  Keyboard,
  Database,
  Sparkles 
} from "lucide-react"

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Settings</h1>
        <p className="text-muted-foreground">
          Manage your account preferences and application settings
        </p>
      </div>

      {/* Profile Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="w-5 h-5" />
            Profile Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Full Name</label>
              <Input defaultValue="John Investor" />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Email</label>
              <Input defaultValue="john@vestintel.com" />
            </div>
          </div>
          <Button>Update Profile</Button>
        </CardContent>
      </Card>

      {/* Subscription */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="w-5 h-5" />
            Subscription
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-semibold">Pro+ Plan</h3>
                <Badge className="bg-primary">
                  <Sparkles className="w-3 h-3 mr-1" />
                  Active
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                $79/month • Renews on March 15, 2026
              </p>
            </div>
            <Button variant="outline">Manage Subscription</Button>
          </div>
          
          <div className="p-4 rounded-lg bg-accent/30 border border-border/50">
            <h4 className="font-semibold mb-2">Your Plan Includes:</h4>
            <ul className="space-y-1 text-sm text-muted-foreground">
              <li>✓ Unlimited watchlist stocks</li>
              <li>✓ Advanced AI insights & predictions</li>
              <li>✓ Institutional signals & flow data</li>
              <li>✓ Real-time alerts & notifications</li>
              <li>✓ Portfolio intelligence & analytics</li>
              <li>✓ Priority support</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Notifications */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5" />
            Notification Preferences
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {[
            { label: "Price Alerts", desc: "Get notified when price targets are hit" },
            { label: "News Updates", desc: "Breaking news for your watchlist" },
            { label: "AI Insights", desc: "New AI-generated market insights" },
            { label: "Portfolio Updates", desc: "Daily portfolio performance summary" },
          ].map((item) => (
            <div key={item.label} className="flex items-center justify-between p-3 rounded-lg border border-border/50">
              <div>
                <div className="font-medium">{item.label}</div>
                <div className="text-sm text-muted-foreground">{item.desc}</div>
              </div>
              <input type="checkbox" defaultChecked className="w-4 h-4" />
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Appearance */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Moon className="w-5 h-5" />
            Appearance
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-2 block">Theme</label>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1">Light</Button>
              <Button className="flex-1">Dark</Button>
              <Button variant="outline" className="flex-1">Auto</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Keyboard Shortcuts */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Keyboard className="w-5 h-5" />
            Keyboard Shortcuts
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            {[
              { shortcut: "⌘ K", action: "Global search" },
              { shortcut: "⌘ D", action: "Go to Dashboard" },
              { shortcut: "⌘ M", action: "Go to Markets" },
              { shortcut: "⌘ P", action: "Go to Portfolio" },
              { shortcut: "⌘ I", action: "Open AI Copilot" },
              { shortcut: "⌘ /", action: "Show shortcuts" },
            ].map((item) => (
              <div key={item.shortcut} className="flex items-center justify-between p-2 rounded hover:bg-accent/50">
                <span className="text-muted-foreground">{item.action}</span>
                <code className="px-2 py-1 rounded bg-accent font-mono text-xs">{item.shortcut}</code>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Data & Privacy */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Data & Privacy
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium">Export Data</div>
              <div className="text-sm text-muted-foreground">Download your portfolio and watchlist data</div>
            </div>
            <Button variant="outline">Export</Button>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium">Delete Account</div>
              <div className="text-sm text-muted-foreground">Permanently delete your account and data</div>
            </div>
            <Button variant="destructive">Delete</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
