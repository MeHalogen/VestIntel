"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Search, TrendingUp, Hash, ArrowRight } from "lucide-react"
import { Input } from "@/components/ui/input"

const quickActions = [
  { label: "Dashboard", path: "/dashboard", icon: "⌘D" },
  { label: "Markets", path: "/dashboard/markets", icon: "⌘M" },
  { label: "Portfolio", path: "/dashboard/portfolio", icon: "⌘P" },
  { label: "AI Copilot", path: "/dashboard/copilot", icon: "⌘I" },
]

// Full NSE universe — NIFTY 50 + NIFTY Next 50 + popular mid/small caps
const ALL_STOCKS = [
  // NIFTY 50
  { symbol: "RELIANCE",      name: "Reliance Industries" },
  { symbol: "TCS",           name: "Tata Consultancy Services" },
  { symbol: "HDFCBANK",      name: "HDFC Bank" },
  { symbol: "BHARTIARTL",    name: "Bharti Airtel" },
  { symbol: "ICICIBANK",     name: "ICICI Bank" },
  { symbol: "INFOSYS",       name: "Infosys" },
  { symbol: "INFY",          name: "Infosys" },
  { symbol: "SBIN",          name: "State Bank of India" },
  { symbol: "HINDUNILVR",    name: "Hindustan Unilever" },
  { symbol: "ITC",           name: "ITC Limited" },
  { symbol: "KOTAKBANK",     name: "Kotak Mahindra Bank" },
  { symbol: "LT",            name: "Larsen & Toubro" },
  { symbol: "AXISBANK",      name: "Axis Bank" },
  { symbol: "BAJFINANCE",    name: "Bajaj Finance" },
  { symbol: "ASIANPAINT",    name: "Asian Paints" },
  { symbol: "MARUTI",        name: "Maruti Suzuki" },
  { symbol: "SUNPHARMA",     name: "Sun Pharmaceutical" },
  { symbol: "TITAN",         name: "Titan Company" },
  { symbol: "ULTRACEMCO",    name: "UltraTech Cement" },
  { symbol: "WIPRO",         name: "Wipro" },
  { symbol: "NTPC",          name: "NTPC Limited" },
  { symbol: "POWERGRID",     name: "Power Grid Corporation" },
  { symbol: "M&M",           name: "Mahindra & Mahindra" },
  { symbol: "HCLTECH",       name: "HCL Technologies" },
  { symbol: "BAJAJFINSV",    name: "Bajaj Finserv" },
  { symbol: "ONGC",          name: "ONGC" },
  { symbol: "TATAMOTORS",    name: "Tata Motors" },
  { symbol: "NESTLEIND",     name: "Nestle India" },
  { symbol: "COALINDIA",     name: "Coal India" },
  { symbol: "ADANIPORTS",    name: "Adani Ports" },
  { symbol: "TATASTEEL",     name: "Tata Steel" },
  { symbol: "JSWSTEEL",      name: "JSW Steel" },
  { symbol: "DRREDDY",       name: "Dr. Reddy's Laboratories" },
  { symbol: "TECHM",         name: "Tech Mahindra" },
  { symbol: "CIPLA",         name: "Cipla" },
  { symbol: "INDUSINDBK",    name: "IndusInd Bank" },
  { symbol: "APOLLOHOSP",    name: "Apollo Hospitals" },
  { symbol: "EICHERMOT",     name: "Eicher Motors" },
  { symbol: "HINDALCO",      name: "Hindalco Industries" },
  { symbol: "GRASIM",        name: "Grasim Industries" },
  { symbol: "BPCL",          name: "BPCL" },
  { symbol: "TATACONSUM",    name: "Tata Consumer Products" },
  { symbol: "BRITANNIA",     name: "Britannia Industries" },
  { symbol: "HEROMOTOCO",    name: "Hero MotoCorp" },
  { symbol: "DIVISLAB",      name: "Divi's Laboratories" },
  { symbol: "SHRIRAMFIN",    name: "Shriram Finance" },
  { symbol: "SBILIFE",       name: "SBI Life Insurance" },
  { symbol: "HDFCLIFE",      name: "HDFC Life Insurance" },
  // NIFTY Next 50 / popular
  { symbol: "ADANIENT",      name: "Adani Enterprises" },
  { symbol: "ADANIGREEN",    name: "Adani Green Energy" },
  { symbol: "ADANITRANS",    name: "Adani Transmission" },
  { symbol: "ADANIPOWER",    name: "Adani Power" },
  { symbol: "AMBUJACEM",     name: "Ambuja Cements" },
  { symbol: "BANKBARODA",    name: "Bank of Baroda" },
  { symbol: "BERGEPAINT",    name: "Berger Paints" },
  { symbol: "BOSCHLTD",      name: "Bosch" },
  { symbol: "CANBK",         name: "Canara Bank" },
  { symbol: "CHOLAFIN",      name: "Cholamandalam Finance" },
  { symbol: "COLPAL",        name: "Colgate-Palmolive" },
  { symbol: "DABUR",         name: "Dabur India" },
  { symbol: "DLF",           name: "DLF Limited" },
  { symbol: "ETERNAL",       name: "Eternal Ltd (formerly Zomato)" },
  { symbol: "ZOMATO",        name: "Zomato / Eternal Ltd" },
  { symbol: "FEDERALBNK",    name: "Federal Bank" },
  { symbol: "GODREJCP",      name: "Godrej Consumer Products" },
  { symbol: "HAVELLS",       name: "Havells India" },
  { symbol: "ICICIlombard",  name: "ICICI Lombard" },
  { symbol: "ICICIPRULIFE",  name: "ICICI Prudential Life" },
  { symbol: "INDHOTEL",      name: "Indian Hotels" },
  { symbol: "IOC",           name: "Indian Oil Corporation" },
  { symbol: "IRCTC",         name: "IRCTC" },
  { symbol: "LUPIN",         name: "Lupin" },
  { symbol: "MARICO",        name: "Marico" },
  { symbol: "MCDOWELL-N",    name: "United Spirits (McDowell's)" },
  { symbol: "MUTHOOTFIN",    name: "Muthoot Finance" },
  { symbol: "NAUKRI",        name: "Info Edge (Naukri)" },
  { symbol: "NMDC",          name: "NMDC" },
  { symbol: "OFSS",          name: "Oracle Financial Services" },
  { symbol: "PAGEIND",       name: "Page Industries (Jockey)" },
  { symbol: "PERSISTENT",    name: "Persistent Systems" },
  { symbol: "PETRONET",      name: "Petronet LNG" },
  { symbol: "PIDILITIND",    name: "Pidilite Industries" },
  { symbol: "PIIND",         name: "PI Industries" },
  { symbol: "PNB",           name: "Punjab National Bank" },
  { symbol: "POLYCAB",       name: "Polycab India" },
  { symbol: "SAIL",          name: "Steel Authority of India" },
  { symbol: "SIEMENS",       name: "Siemens India" },
  { symbol: "SOLARINDS",     name: "Solar Industries" },
  { symbol: "SWIGGY",        name: "Swiggy" },
  { symbol: "TATAPOWER",     name: "Tata Power" },
  { symbol: "TORNTPHARM",    name: "Torrent Pharmaceuticals" },
  { symbol: "TRENT",         name: "Trent (Westside)" },
  { symbol: "UNOMINDA",      name: "Uno Minda" },
  { symbol: "UPL",           name: "UPL Limited" },
  { symbol: "VEDL",          name: "Vedanta" },
  { symbol: "VOLTAS",        name: "Voltas" },
  { symbol: "ZYDUSLIFE",     name: "Zydus Lifesciences" },
  // Popular mid-caps
  { symbol: "ABFRL",         name: "Aditya Birla Fashion" },
  { symbol: "ALKEM",         name: "Alkem Laboratories" },
  { symbol: "APLAPOLLO",     name: "APL Apollo Tubes" },
  { symbol: "ASTRAL",        name: "Astral Limited" },
  { symbol: "ATUL",          name: "Atul Ltd" },
  { symbol: "AUBANK",        name: "AU Small Finance Bank" },
  { symbol: "BALKRISIND",    name: "Balkrishna Industries" },
  { symbol: "BANDHANBNK",    name: "Bandhan Bank" },
  { symbol: "BEL",           name: "Bharat Electronics" },
  { symbol: "BHARATFORG",    name: "Bharat Forge" },
  { symbol: "CESC",          name: "CESC Limited" },
  { symbol: "COFORGE",       name: "Coforge" },
  { symbol: "CROMPTON",      name: "Crompton Greaves" },
  { symbol: "DEEPAKNTR",     name: "Deepak Nitrite" },
  { symbol: "DIXON",         name: "Dixon Technologies" },
  { symbol: "FINPIPE",       name: "Finolex Industries" },
  { symbol: "GMRINFRA",      name: "GMR Airports" },
  { symbol: "GODREJPROP",    name: "Godrej Properties" },
  { symbol: "HFCL",          name: "HFCL Limited" },
  { symbol: "IDFCFIRSTB",    name: "IDFC First Bank" },
  { symbol: "INDIANB",       name: "Indian Bank" },
  { symbol: "INDIGO",        name: "IndiGo (InterGlobe Aviation)" },
  { symbol: "JSWENERGY",     name: "JSW Energy" },
  { symbol: "JUBLFOOD",      name: "Jubilant FoodWorks (Domino's)" },
  { symbol: "KAJARIACER",    name: "Kajaria Ceramics" },
  { symbol: "KPITTECH",      name: "KPIT Technologies" },
  { symbol: "LAURUSLABS",    name: "Laurus Labs" },
  { symbol: "LICHSGFIN",     name: "LIC Housing Finance" },
  { symbol: "LTIM",          name: "LTIMindtree" },
  { symbol: "LTTS",          name: "L&T Technology Services" },
  { symbol: "LUXIND",        name: "Lux Industries" },
  { symbol: "MANAPPURAM",    name: "Manappuram Finance" },
  { symbol: "METROPOLIS",    name: "Metropolis Healthcare" },
  { symbol: "MFSL",          name: "Max Financial Services" },
  { symbol: "MGL",           name: "Mahanagar Gas" },
  { symbol: "MOTHERSON",     name: "Samvardhana Motherson" },
  { symbol: "MPHASIS",       name: "Mphasis" },
  { symbol: "OBEROIRLTY",    name: "Oberoi Realty" },
  { symbol: "OIL",           name: "Oil India" },
  { symbol: "PAYTM",         name: "Paytm (One97 Communications)" },
  { symbol: "PGHH",          name: "Procter & Gamble Hygiene" },
  { symbol: "PHOENIXLTD",    name: "Phoenix Mills" },
  { symbol: "RELAXO",        name: "Relaxo Footwears" },
  { symbol: "RITES",         name: "RITES Limited" },
  { symbol: "SBICARD",       name: "SBI Cards" },
  { symbol: "SCHAEFFLER",    name: "Schaeffler India" },
  { symbol: "STARHEALTH",    name: "Star Health Insurance" },
  { symbol: "SUNDARMFIN",    name: "Sundaram Finance" },
  { symbol: "SUPREMEIND",    name: "Supreme Industries" },
  { symbol: "TANLA",         name: "Tanla Platforms" },
  { symbol: "TATACOMM",      name: "Tata Communications" },
  { symbol: "TATACHEM",      name: "Tata Chemicals" },
  { symbol: "TMLIND",        name: "Tata Metaliks" },
  { symbol: "TORNTPOWER",    name: "Torrent Power" },
  { symbol: "TTKPRESTIG",    name: "TTK Prestige" },
  { symbol: "VBL",           name: "Varun Beverages" },
  { symbol: "WIPRO",         name: "Wipro" },
  { symbol: "ZEEL",          name: "Zee Entertainment" },
]

// Deduplicate by symbol
const NSE_STOCKS = ALL_STOCKS.filter(
  (s, i, arr) => arr.findIndex((x) => x.symbol === s.symbol) === i
)

const POPULAR = ["RELIANCE","TCS","HDFCBANK","ICICIBANK","INFY","SBIN","ETERNAL","ZOMATO","INDIGO","PAYTM"]
const popularStocks = NSE_STOCKS.filter((s) => POPULAR.includes(s.symbol))


export function CommandBar() {
  const router = useRouter()
  const [query, setQuery] = useState("")
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault()
        setIsOpen(true)
      }
      if (e.key === "Escape") {
        setIsOpen(false)
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [])

  const handleStockClick = (symbol: string) => {
    router.push(`/dashboard/stocks/${symbol}`)
    setIsOpen(false)
    setQuery("")
  }

  const handleActionClick = (path: string) => {
    router.push(path)
    setIsOpen(false)
    setQuery("")
  }

  return (
    <>
      {/* Search Trigger */}
      <div
        onClick={() => setIsOpen(true)}
        className="relative flex-1 max-w-md cursor-text"
      >
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search stocks, companies, sectors..."
          className="pl-10 pr-12"
          readOnly
        />
        <kbd className="absolute right-3 top-1/2 -translate-y-1/2 px-2 py-1 text-xs bg-muted rounded border">
          ⌘K
        </kbd>
      </div>

      {/* Command Palette Modal */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50"
          onClick={() => setIsOpen(false)}
        >
          <div
            className="fixed top-[20%] left-1/2 -translate-x-1/2 w-full max-w-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-card border border-border rounded-lg shadow-2xl">
              {/* Search Input */}
              <div className="p-4 border-b border-border">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    placeholder="Search stocks, companies, sectors..."
                    className="pl-10 text-lg"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    autoFocus
                  />
                </div>
              </div>

              {/* Results */}
              <div className="max-h-96 overflow-y-auto">
                {query === "" && (
                  <>
                    {/* Quick Actions */}
                    <div className="p-2">
                      <div className="text-xs font-semibold text-muted-foreground px-3 py-2">
                        Quick Actions
                      </div>
                      {quickActions.map((action) => (
                        <button
                          key={action.path}
                          onClick={() => handleActionClick(action.path)}
                          className="w-full flex items-center justify-between px-3 py-2 rounded hover:bg-accent transition-colors text-left"
                        >
                          <span>{action.label}</span>
                          <kbd className="px-2 py-1 text-xs bg-muted rounded border">
                            {action.icon}
                          </kbd>
                        </button>
                      ))}
                    </div>

                    {/* Popular Stocks */}
                    <div className="p-2 border-t border-border">
                      <div className="text-xs font-semibold text-muted-foreground px-3 py-2 flex items-center gap-2">
                        <TrendingUp className="w-3 h-3" />
                        Popular Stocks
                      </div>
                      {popularStocks.map((stock) => (
                        <button
                          key={stock.symbol}
                          onClick={() => handleStockClick(stock.symbol)}
                          className="w-full flex items-center gap-3 px-3 py-2 rounded hover:bg-accent transition-colors text-left"
                        >
                          <Hash className="w-4 h-4 text-muted-foreground" />
                          <div className="flex-1">
                            <div className="font-semibold">{stock.symbol}</div>
                            <div className="text-xs text-muted-foreground">{stock.name}</div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </>
                )}

                {query !== "" && (() => {
                  const results = NSE_STOCKS.filter((stock) =>
                    stock.symbol.toLowerCase().includes(query.toLowerCase()) ||
                    stock.name.toLowerCase().includes(query.toLowerCase())
                  ).slice(0, 10)
                  const sym = query.trim().toUpperCase()
                  const exactExists = NSE_STOCKS.some((s) => s.symbol === sym)

                  return (
                    <div className="p-2">
                      <div className="text-xs font-semibold text-muted-foreground px-3 py-2">
                        Search Results
                      </div>
                      {results.map((stock) => (
                        <button
                          key={stock.symbol}
                          onClick={() => handleStockClick(stock.symbol)}
                          className="w-full flex items-center gap-3 px-3 py-2 rounded hover:bg-accent transition-colors text-left"
                        >
                          <Hash className="w-4 h-4 text-muted-foreground" />
                          <div className="flex-1">
                            <div className="font-semibold">{stock.symbol}</div>
                            <div className="text-xs text-muted-foreground">{stock.name}</div>
                          </div>
                        </button>
                      ))}
                      {/* Always show a direct "search NSE: XYZ" fallback */}
                      {!exactExists && sym.length >= 2 && (
                        <button
                          onClick={() => handleStockClick(sym)}
                          className="w-full flex items-center gap-3 px-3 py-2 rounded hover:bg-accent transition-colors text-left border-t border-border mt-1 pt-3"
                        >
                          <ArrowRight className="w-4 h-4 text-primary" />
                          <div className="flex-1">
                            <div className="font-semibold text-primary">Search NSE: {sym}</div>
                            <div className="text-xs text-muted-foreground">Go to stock page for {sym}</div>
                          </div>
                        </button>
                      )}
                    </div>
                  )
                })()}
              </div>

              {/* Footer */}
              <div className="p-3 border-t border-border bg-muted/30 flex items-center justify-between text-xs text-muted-foreground">
                <div className="flex items-center gap-4">
                  <span>↑↓ Navigate</span>
                  <span>↵ Select</span>
                  <span>ESC Close</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
