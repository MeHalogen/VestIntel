# VestIntel

**AI-Powered Stock Intelligence Platform for Modern Investors**

VestIntel is a premium full-stack SaaS application that transforms raw financial market data into actionable investor insights. The platform combines real-time market data, AI-powered analytics, and intuitive data visualization to create a professional-grade investment intelligence tool.

![VestIntel Preview](https://via.placeholder.com/1200x600/0B0F19/4F8CFF?text=VestIntel+-+Market+Intelligence+Platform)

## 🌟 Features

### Core Features
- **Real-Time Market Data** - Live stock quotes, indices, and market updates
- **AI-Powered Insights** - Machine learning-driven stock analysis and predictions
- **Interactive Charts** - Advanced charting with technical indicators (RSI, MACD, Moving Averages)
- **Portfolio Management** - Track investments, analyze performance, and diversification
- **Smart Alerts** - Price, volume, and technical indicator notifications
- **Watchlists** - Monitor favorite stocks with real-time updates
- **Market Analysis** - Sector performance, heatmaps, and sentiment indicators

### Premium Features
- **Dark Mode First Design** - Professional fintech aesthetic
- **Responsive Dashboard** - Three-column layout optimized for data density
- **Real-Time Streaming** - WebSocket connections for live updates
- **Redis Caching** - Sub-500ms chart rendering
- **Advanced Analytics** - Fear & Greed index, sentiment scoring
- **API Integration** - Alpha Vantage, Finnhub, Yahoo Finance

## 🛠️ Tech Stack

### Frontend
- **Next.js 14** - React framework with App Router
- **TypeScript** - Type-safe development
- **TailwindCSS** - Utility-first styling
- **ShadCN UI** - High-quality component library
- **Recharts** - Data visualization
- **Framer Motion** - Smooth animations
- **React Query** - Server state management
- **Zustand** - Client state management

### Backend
- **FastAPI** - Modern Python web framework
- **PostgreSQL** - Primary database
- **Redis** - Caching layer
- **SQLAlchemy** - ORM
- **Pydantic** - Data validation
- **Alembic** - Database migrations

### APIs & Data
- **Alpha Vantage** - Stock market data
- **Finnhub** - Real-time quotes and news
- **Yahoo Finance** - Historical data

## 📦 Installation

### Prerequisites
- Node.js 18+ and npm/yarn
- Python 3.11+
- PostgreSQL 14+
- Redis 7+

### Frontend Setup

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build
npm start
```

The frontend will be available at `http://localhost:3000`

### Backend Setup

```bash
# Navigate to backend directory
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Copy environment file
cp .env.example .env

# Edit .env and add your API keys and database credentials

# Setup database
psql -U postgres
CREATE DATABASE vestintel;
\q

# Run migrations
psql -U postgres -d vestintel -f schema.sql

# Start FastAPI server
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

The API will be available at `http://localhost:8000`
API Documentation: `http://localhost:8000/docs`

### Database Setup

```bash
# Start PostgreSQL
brew services start postgresql  # macOS
# or
sudo systemctl start postgresql  # Linux

# Start Redis
brew services start redis  # macOS
# or
sudo systemctl start redis  # Linux
```

## 🔑 Environment Variables

Create a `.env` file in the backend directory:

```env
DATABASE_URL=postgresql://user:password@localhost:5432/vestintel
REDIS_URL=redis://localhost:6379
ALPHA_VANTAGE_API_KEY=your_key_here
FINNHUB_API_KEY=your_key_here
SECRET_KEY=generate_with_openssl_rand_hex_32
```

### Getting API Keys

- **Alpha Vantage**: [https://www.alphavantage.co/support/#api-key](https://www.alphavantage.co/support/#api-key)
- **Finnhub**: [https://finnhub.io/register](https://finnhub.io/register)

## 📁 Project Structure

```
VestIntel/
├── app/                          # Next.js application
│   ├── dashboard/                # Dashboard pages
│   │   ├── stocks/[symbol]/     # Stock detail pages
│   │   ├── portfolio/           # Portfolio management
│   │   └── markets/             # Market overview
│   ├── globals.css              # Global styles
│   ├── layout.tsx               # Root layout
│   └── page.tsx                 # Landing page
├── components/                   # React components
│   ├── dashboard/               # Dashboard components
│   ├── landing/                 # Landing page components
│   ├── stocks/                  # Stock components
│   ├── portfolio/               # Portfolio components
│   ├── markets/                 # Market components
│   └── ui/                      # UI primitives (ShadCN)
├── lib/                         # Utilities
│   └── utils.ts                 # Helper functions
├── hooks/                       # Custom React hooks
├── backend/                     # FastAPI backend
│   ├── api/routes/              # API endpoints
│   ├── core/                    # Core configuration
│   ├── models/                  # Database models
│   ├── schemas/                 # Pydantic schemas
│   ├── services/                # Business logic
│   ├── main.py                  # FastAPI app
│   └── requirements.txt         # Python dependencies
├── public/                      # Static assets
├── package.json                 # Node dependencies
├── tailwind.config.ts           # Tailwind configuration
├── tsconfig.json                # TypeScript configuration
└── README.md                    # This file
```

## 🎨 Design System

### Color Palette
```css
Background: #0B0F19
Panels: #141A2A
Primary: #4F8CFF
Bullish: #22C55E
Bearish: #EF4444
```

### Typography
- **Font**: Inter
- **Hierarchy**: Clear size and weight distinctions
- **Readability**: Optimized for data-dense interfaces

## 🚀 Key Pages

### Landing Page (`/`)
- Animated hero section
- Live market ticker
- Dashboard preview
- AI insights showcase
- Pricing section

### Dashboard (`/dashboard`)
- Market overview cards
- Trending stocks widget
- Watchlist
- Recent activity feed

### Stock Analysis (`/dashboard/stocks/[symbol]`)
- Real-time price data
- Interactive charts with indicators
- AI-powered analysis
- Key metrics and fundamentals

### Portfolio (`/dashboard/portfolio`)
- Total value and performance
- Asset allocation pie chart
- Holdings table
- Diversification metrics

### Markets (`/dashboard/markets`)
- Global indices
- Sector performance
- Market heatmap
- Sentiment indicators

## 📊 API Endpoints

### Stocks
- `GET /api/stocks/{symbol}/quote` - Get stock quote
- `GET /api/stocks/{symbol}/history` - Historical data
- `GET /api/stocks/{symbol}/analysis` - AI analysis
- `GET /api/stocks/search` - Search stocks

### Markets
- `GET /api/markets/indices` - Major indices
- `GET /api/markets/sectors` - Sector performance
- `GET /api/markets/sentiment` - Market sentiment

### Portfolio
- `GET /api/portfolio` - List portfolios
- `POST /api/portfolio` - Create portfolio
- `GET /api/portfolio/{id}/holdings` - Get holdings
- `GET /api/portfolio/{id}/analytics` - Portfolio analytics

### Alerts
- `GET /api/alerts` - List alerts
- `POST /api/alerts` - Create alert
- `DELETE /api/alerts/{id}` - Delete alert

### AI Insights
- `GET /api/insights/{symbol}` - Stock insights
- `GET /api/insights/market/brief` - Market brief

## 💎 Premium Features

### Free Plan
- 5 watchlist stocks
- Basic analytics
- Delayed data (15min)
- Community support

### Pro Plan ($29/month)
- Unlimited watchlist
- Real-time data
- AI insights
- Advanced indicators
- Price & volume alerts
- Priority support

### Pro+ Plan ($99/month)
- Everything in Pro
- Portfolio analytics
- Institutional signals
- AI forecasts
- Custom alerts
- API access
- Dedicated support

## 🔒 Security

- JWT-based authentication
- Password hashing with bcrypt
- SQL injection protection via SQLAlchemy
- CORS configuration
- Rate limiting on API endpoints
- Environment-based secrets management

## 📈 Performance

- Redis caching for API responses
- Chart rendering < 500ms
- Optimized database queries with indexes
- CDN-ready static assets
- Code splitting and lazy loading

## 🧪 Testing

```bash
# Frontend tests
npm test

# Backend tests
cd backend
pytest
```

## 📝 License

This project is licensed under the MIT License.

## 🤝 Contributing

Contributions are welcome! Please read the contributing guidelines first.

## 📧 Contact

For support or inquiries, please contact: support@vestintel.com

## 🙏 Acknowledgments

- ShadCN UI for the component library
- Vercel for Next.js
- FastAPI team for the excellent framework
- Financial data providers (Alpha Vantage, Finnhub)

---

**Built with ❤️ for modern investors**
