import type { MetadataRoute } from 'next'
import { isSearchIndexingEnabled, SITE_URL } from '@/config/seo'

export default function robots(): MetadataRoute.Robots {
  const indexable = isSearchIndexingEnabled()
  return {
    // Allow HTML crawling so bots can read noindex on staging and excluded pages.
    // The wildcard also covers Googlebot, Bingbot and OAI-SearchBot.
    rules: [
      { userAgent: '*', allow: '/', disallow: ['/api/'] },
      // AI search may crawl public marketing pages only after live launch.
      indexable
        ? { userAgent: 'OAI-SearchBot', allow: '/', disallow: ['/api/', '/activate', '/hero-preview', '/privacy', '/terms'] }
        : { userAgent: 'OAI-SearchBot', disallow: '/' },
    ],
    ...(indexable ? { sitemap: `${SITE_URL}/sitemap.xml` } : {}),
  }
}
