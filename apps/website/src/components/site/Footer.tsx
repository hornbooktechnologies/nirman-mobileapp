import Image from 'next/image'
import Link from 'next/link'
import logo from '@/assets/brand/horizontal-logo.png'

const PAGES = [
  { href: '/', label: 'Home' },
  { href: '/#product', label: 'The app' },
  { href: '/about', label: 'About us' },
  { href: '/contact', label: 'Contact us' },
]
const LEGAL = [
  { href: '/terms', label: 'Terms & Conditions' },
  { href: '/privacy', label: 'Privacy Policy' },
]

export default function Footer() {
  return (
    <footer className="border-t border-coffee/[0.1] bg-cream">
      <div className="shell grid gap-10 py-14 md:grid-cols-[minmax(0,1fr)_auto] md:items-start">
        <div>
          <Link href="/" aria-label="NirmanSite home" className="inline-block">
            <Image src={logo} alt="NirmanSite" height={52} className="h-[44px] w-auto md:h-[52px]" />
          </Link>
          <p className="mt-4 max-w-[36ch] text-[15px] font-medium leading-relaxed text-ink/70">Construction management for builders &amp; contractors. On site and in the office.</p>
        </div>
        <nav aria-label="Footer" className="grid grid-cols-2 gap-x-14 gap-y-3 text-[15px] font-semibold">
          <ul className="flex flex-col gap-3">
            {PAGES.map(p => (
              <li key={p.href}>
                <Link href={p.href} className="text-ink/75 transition-colors hover:text-copper-700">
                  {p.label}
                </Link>
              </li>
            ))}
          </ul>
          <ul className="flex flex-col gap-3">
            {LEGAL.map(p => (
              <li key={p.href}>
                <Link href={p.href} className="text-ink/75 transition-colors hover:text-copper-700">
                  {p.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
      <div className="shell flex flex-wrap items-center justify-between gap-3 border-t border-coffee/[0.08] py-6 text-[13.5px] font-medium text-muted">
        <p>© {new Date().getFullYear()} NirmanSite. All rights reserved.</p>
        <p>Made for the people who build India.</p>
      </div>
    </footer>
  )
}
