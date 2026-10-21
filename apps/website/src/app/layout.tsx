import type { Metadata, Viewport } from 'next'
import { preload } from 'react-dom'
import { isSearchIndexingEnabled, SHARE_IMAGE, SITE_DESCRIPTION, SITE_TITLE, SITE_URL } from '@/config/seo'
import './globals.css'

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE_TITLE} · NirmanSite`,
    template: '%s · NirmanSite',
  },
  description: SITE_DESCRIPTION,
  robots: { index: isSearchIndexingEnabled(), follow: true },
  openGraph: { type: 'website', siteName: 'NirmanSite', locale: 'en_IN', title: `${SITE_TITLE} · NirmanSite`, description: SITE_DESCRIPTION, images: [SHARE_IMAGE] },
  twitter: { card: 'summary_large_image', title: `${SITE_TITLE} · NirmanSite`, description: SITE_DESCRIPTION, images: [SHARE_IMAGE.url] },
}

export const viewport: Viewport = {
  themeColor: '#f7f5ef',
}

/**
 * Root frame shared by every route. The marketing pages add the header and footer in (site)/layout.tsx;
 * /activate is a focused, standalone page opened from invitation emails.
 */
export default function RootLayout({ children }: { children: React.ReactNode }) {
  preload('/fonts/manrope-latin-wght.woff2', { as: 'font', type: 'font/woff2', crossOrigin: 'anonymous' })
  return (
    <html lang="en">
      <body>
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-full focus:bg-coffee focus:px-5 focus:py-3 focus:text-cream"
        >
          Skip to main content
        </a>
        {children}
      </body>
    </html>
  )
}
