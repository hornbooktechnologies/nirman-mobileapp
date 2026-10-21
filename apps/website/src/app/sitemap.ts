import type { MetadataRoute } from 'next'
import { isSearchIndexingEnabled, SITE_URL } from '@/config/seo'

export default function sitemap(): MetadataRoute.Sitemap {
  if (!isSearchIndexingEnabled()) return []
  // Legal pages remain review drafts; activation and preview pages are never listed.
  return ['/', '/about', '/contact'].map(path => ({ url: `${SITE_URL}${path}` }))
}
