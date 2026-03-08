# VestIntel - Quick Start Guide

## 🚀 Getting Started in 5 Minutes

### 1. Install Dependencies

#### Frontend
```bash
npm install
```

#### Backend
```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### 2. Setup Database

```bash
# Install PostgreSQL and Redis (macOS)
brew install postgresql redis

# Start services
brew services start postgresql
brew services start redis

# Create database
psql postgres
CREATE DATABASE vestintel;
\q

# Run schema
psql -d vestintel -f backend/schema.sql
```

### 3. Configure Environment

```bash
# Backend
cd backend
cp .env.example .env
# Edit .env and add your API keys
```

### 4. Run the Application

#### Terminal 1 - Frontend
```bash
npm run dev
```
Access at: http://localhost:3000

#### Terminal 2 - Backend
```bash
cd backend
source venv/bin/activate
uvicorn main:app --reload
```
API at: http://localhost:8000
Docs at: http://localhost:8000/docs

## 📊 Test the Application

1. **Landing Page**: Visit http://localhost:3000
2. **Dashboard**: Click "Start Free Analysis" or visit /dashboard
3. **Stock Search**: Try searching for "AAPL" or "TSLA"
4. **Markets**: View global indices at /dashboard/markets
5. **Portfolio**: Create and manage portfolios at /dashboard/portfolio

## 🔑 API Keys (Optional for Testing)

The app works with mock data initially. To get real data:

1. **Alpha Vantage**: https://www.alphavantage.co/support/#api-key (Free)
2. **Finnhub**: https://finnhub.io/register (Free tier available)

Add keys to `backend/.env`:
```env
ALPHA_VANTAGE_API_KEY=your_key_here
FINNHUB_API_KEY=your_key_here
```

## 🎨 Features to Explore

- ✅ Real-time market data (mock initially)
- ✅ Interactive stock charts with Recharts
- ✅ AI-powered stock analysis
- ✅ Portfolio tracking and analytics
- ✅ Custom price alerts
- ✅ Dark mode fintech UI
- ✅ Responsive dashboard layout

## 🐛 Troubleshooting

### Port Already in Use
```bash
# Frontend (3000)
lsof -ti:3000 | xargs kill -9

# Backend (8000)
lsof -ti:8000 | xargs kill -9
```

### Database Connection Error
```bash
# Check PostgreSQL is running
brew services list | grep postgresql

# Restart if needed
brew services restart postgresql
```

### Module Not Found Errors
```bash
# Frontend
rm -rf node_modules package-lock.json
npm install

# Backend
pip install --upgrade -r requirements.txt
```

## 📚 Next Steps

1. Customize the color scheme in `tailwind.config.ts`
2. Add real API integrations in `backend/services/`
3. Implement user authentication
4. Deploy to Vercel (frontend) and Railway/Render (backend)
5. Set up CI/CD pipeline

## 🎯 Production Checklist

- [ ] Update SECRET_KEY in backend/.env
- [ ] Configure production database
- [ ] Set up Redis instance
- [ ] Add rate limiting
- [ ] Enable HTTPS
- [ ] Configure CORS for production domain
- [ ] Set up monitoring (Sentry, LogRocket)
- [ ] Add analytics (Google Analytics, Mixpanel)

---

**Need help?** Check the full README.md or open an issue on GitHub.
