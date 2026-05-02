/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  images: {
    domains: ['localhost'],
  },
  async rewrites() {
    return [
      // Routes where FastAPI requires a trailing slash - handle server-side to avoid CORS redirects
      { source: '/api/pulse', destination: 'http://localhost:8000/api/pulse/' },
      { source: '/api/portfolio', destination: 'http://localhost:8000/api/portfolio/' },
      { source: '/api/alerts', destination: 'http://localhost:8000/api/alerts/' },
      { source: '/api/opportunities', destination: 'http://localhost:8000/api/opportunities/' },
      // General proxy for all other /api/* routes
      { source: '/api/:path*', destination: 'http://localhost:8000/api/:path*' },
    ]
  },
}

module.exports = nextConfig
