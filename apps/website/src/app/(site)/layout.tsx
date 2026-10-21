import Header from '@/components/site/Header'
import Footer from '@/components/site/Footer'
import Script from 'next/script'
import { isSearchIndexingEnabled } from '@/config/seo'

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Header />
      <main id="main-content">{children}</main>
      <Footer />
      {isSearchIndexingEnabled() && (
        <>
          <Script
            src="https://www.googletagmanager.com/gtag/js?id=G-W2LK4EB9N1"
            strategy="afterInteractive"
          />
          <Script id="nirmansite-google-analytics" strategy="afterInteractive">
            {`
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', 'G-W2LK4EB9N1');
            `}
          </Script>
        </>
      )}
    </>
  )
}
