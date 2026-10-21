import type { Metadata } from 'next'

export const SITE_URL = 'https://nirmansite.com'
export const SITE_TITLE = 'Construction management app for builders & contractors'
export const SITE_DESCRIPTION = 'NirmanSite helps Indian builders and contractors organise labour attendance, wages, Kharchi, site expenses, materials, construction progress and sales on mobile and web.'
export const SHARE_IMAGE = {
  url: '/media/nirmansite-social.png',
  width: 1200,
  height: 630,
  alt: 'NirmanSite — construction management for builders and contractors',
}

/** Opt in only on the live domain. Preview builds stay excluded even with copied production variables. */
export function isSearchIndexingEnabled(env: NodeJS.ProcessEnv = process.env) {
  if (env.SITE_INDEXING_ENABLED !== 'true' || env.NODE_ENV !== 'production') return false
  if (env.VERCEL_ENV && env.VERCEL_ENV !== 'production') return false
  try {
    const configured = new URL(env.NEXT_PUBLIC_SITE_URL || '')
    return configured.origin === SITE_URL && configured.pathname === '/' && !configured.search && !configured.hash
  } catch {
    return false
  }
}

export function publicPageMetadata(path: string, title: string, description: string): Metadata {
  return {
    title,
    description,
    alternates: { canonical: `${SITE_URL}${path}` },
    openGraph: {
      type: 'website', siteName: 'NirmanSite', locale: 'en_IN',
      url: `${SITE_URL}${path}`, title: `${title} · NirmanSite`, description,
      images: [SHARE_IMAGE],
    },
    twitter: { card: 'summary_large_image', title: `${title} · NirmanSite`, description, images: [SHARE_IMAGE.url] },
  }
}
