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
  outputFileTracingIncludes: {
    '/api/contact': ['./src/assets/brand/horizontal-logo.png'],
  },
  images: {
    // app screenshots carry small UI text, so they are served at a higher quality than the default 75
    qualities: [75, 90],
    formats: ['image/avif', 'image/webp'],
  },
}

export default nextConfig
