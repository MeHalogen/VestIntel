/** @type {import('next').NextConfig} */
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8000'

const nextConfig = {
  images: {
    domains: ['localhost'],
  },
  async rewrites() {
    return [
      { source: '/api/pulse',         destination: `${BACKEND_URL}/api/pulse/` },
      { source: '/api/portfolio',     destination: `${BACKEND_URL}/api/portfolio/` },
      { source: '/api/alerts',        destination: `${BACKEND_URL}/api/alerts/` },
      { source: '/api/opportunities', destination: `${BACKEND_URL}/api/opportunities/` },
      { source: '/api/:path*',        destination: `${BACKEND_URL}/api/:path*` },
    ]
  },
}

module.exports = nextConfig
