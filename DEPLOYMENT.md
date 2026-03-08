# VestIntel Deployment Guide

## 🚀 Deployment Options

### Option 1: Vercel + Railway (Recommended)

#### Frontend (Vercel)
1. Push code to GitHub
2. Go to [Vercel](https://vercel.com)
3. Import your repository
4. Configure build settings:
   - Framework: Next.js
   - Build Command: `npm run build`
   - Output Directory: `.next`
5. Add environment variables:
   ```
   NEXT_PUBLIC_API_URL=your-backend-url
   ```
6. Deploy!

#### Backend (Railway)
1. Go to [Railway](https://railway.app)
2. New Project → Deploy from GitHub
3. Select your repo and `backend` folder
4. Add PostgreSQL and Redis services
5. Configure environment variables (from `.env.example`)
6. Deploy!

### Option 2: Docker Deployment

```bash
# Build and run with Docker Compose
docker-compose up -d

# Access:
# Frontend: http://localhost:3000
# Backend: http://localhost:8000
# PostgreSQL: localhost:5432
# Redis: localhost:6379
```

### Option 3: Traditional VPS (DigitalOcean, AWS, etc.)

#### Setup Server
```bash
# Install dependencies
sudo apt update
sudo apt install -y nodejs npm python3 python3-pip postgresql redis-server nginx

# Clone repository
git clone https://github.com/yourusername/vestintel.git
cd vestintel
```

#### Frontend
```bash
# Build frontend
npm install
npm run build

# Serve with PM2
npm install -g pm2
pm2 start npm --name "vestintel-frontend" -- start
```

#### Backend
```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Run with Gunicorn
pip install gunicorn
pm2 start "gunicorn main:app --workers 4 --worker-class uvicorn.workers.UvicornWorker --bind 0.0.0.0:8000" --name vestintel-api
```

#### Nginx Configuration
```nginx
# /etc/nginx/sites-available/vestintel
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    location /api {
        proxy_pass http://localhost:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/vestintel /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

## 🔒 Security Checklist

- [ ] Change SECRET_KEY to a strong random value
- [ ] Use environment variables for all secrets
- [ ] Enable HTTPS (Let's Encrypt)
- [ ] Configure CORS for production domain only
- [ ] Set up rate limiting
- [ ] Enable PostgreSQL SSL connections
- [ ] Use Redis password authentication
- [ ] Implement API key rotation
- [ ] Set up monitoring and logging
- [ ] Configure backup strategy

## 📊 Monitoring

### Recommended Tools
- **Error Tracking**: Sentry
- **Performance**: Vercel Analytics / New Relic
- **Uptime**: UptimeRobot
- **Logs**: LogRocket / DataDog

### Setup Sentry
```bash
npm install @sentry/nextjs
npx @sentry/wizard -i nextjs
```

## 🔄 CI/CD Pipeline

### GitHub Actions Example
```yaml
# .github/workflows/deploy.yml
name: Deploy
on:
  push:
    branches: [main]

jobs:
  deploy-frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: vercel/action@v1
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
  
  deploy-backend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Deploy to Railway
        run: railway up
        env:
          RAILWAY_TOKEN: ${{ secrets.RAILWAY_TOKEN }}
```

## 🌍 DNS Configuration

Point your domain to:
- Vercel IP (Frontend)
- Railway/Your Backend URL

Example DNS records:
```
A     @       76.76.21.21
CNAME api     your-backend.railway.app
```

## 📈 Scaling Considerations

### Frontend
- Use Vercel Edge Functions for SSR
- Implement ISR for static pages
- Configure CDN caching

### Backend
- Use connection pooling (pgBouncer)
- Scale Redis with Redis Cluster
- Implement worker queue (Celery)
- Use load balancer for multiple instances

### Database
- Enable read replicas
- Configure automatic backups
- Monitor slow queries
- Index optimization

## 💰 Cost Estimation

### Hobby/MVP
- Vercel: $0 (Hobby plan)
- Railway: ~$10-20/month
- Total: ~$10-20/month

### Production
- Vercel: $20/month (Pro)
- Railway/AWS: ~$50-100/month
- PostgreSQL: ~$25/month (managed)
- Redis: ~$15/month (managed)
- Total: ~$110-160/month

---

**Ready to deploy?** Follow the quickstart guide and scale as you grow!
