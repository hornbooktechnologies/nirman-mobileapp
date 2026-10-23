import type { NextConfig } from 'next'
import path from 'node:path'
import { isSearchIndexingEnabled } from './src/config/seo'

const nextConfig: NextConfig = {
  output: 'standalone',
  outputFileTracingRoot: path.join(__dirname, '../..'),
  async headers() {
    return isSearchIndexingEnabled() ? [] : [{
      source: '/:path*',
      headers: [{ key: 'X-Robots-Tag', value: 'noindex, follow' }],
    }]
  },
  async rewrites() {
    const api = (process.env.API_BASE_URL || 'http://localhost:4000/api/v1').replace(/\/$/, '')
    return [{ source: '/api/contact', destination: `${api}/public/contact` }]
  },
  images: {
    // app screenshots carry small UI text, so they are served at a higher quality than the default 75
    qualities: [75, 90],
    formats: ['image/avif', 'image/webp'],
  },
}

export default nextConfig
