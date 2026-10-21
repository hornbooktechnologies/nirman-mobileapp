'use client'

import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import logo from '@/assets/brand/horizontal-logo.png'

const NAV = [
  { href: '/', label: 'Home' },
  { href: '/about', label: 'About us' },
  { href: '/contact', label: 'Contact us' },
]

export default function Header() {
  const pathname = usePathname()
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => setOpen(false), [pathname])

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-[background-color,box-shadow,backdrop-filter] duration-300 ${
        scrolled || open ? 'bg-cream/90 shadow-[0_1px_0_var(--color-line)] backdrop-blur-xl' : 'bg-cream/45 backdrop-blur-md'
      }`}
    >
      <div className="shell flex h-[72px] items-center justify-between">
        <Link href="/" aria-label="NirmanSite home" className="shrink-0">
          <Image src={logo} alt="NirmanSite" height={52} priority className="h-[44px] w-auto md:h-[52px]" />
        </Link>

        <nav aria-label="Main" className="hidden items-center gap-1 md:flex">
          {NAV.map(item => {
            const active = item.href === pathname
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={`rounded-full px-4 py-2 text-[15px] font-semibold transition-colors hover:text-copper-700 ${
                  active ? 'text-coffee' : 'text-ink/75'
                }`}
              >
                {item.label}
              </Link>
            )
          })}
        </nav>

        <div className="flex items-center gap-2">
          <Link
            href="/contact"
            className="group hidden h-11 cursor-pointer items-center gap-2 rounded-full bg-copper-600 pl-5 pr-4 text-[15px] font-bold text-white transition-colors duration-200 hover:bg-[#96501e] sm:inline-flex"
          >
            Request demo
            <Arrow className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </Link>
          <button
            type="button"
            onClick={() => setOpen(o => !o)}
            aria-expanded={open}
            aria-controls="mobile-nav"
            aria-label={open ? 'Close menu' : 'Open menu'}
            className="grid size-11 place-items-center rounded-full bg-coffee text-cream md:hidden"
          >
            <span className="relative block h-3 w-5">
              <span className={`absolute left-0 h-0.5 w-5 rounded bg-current transition-transform ${open ? 'top-1.5 rotate-45' : 'top-0'}`} />
              <span className={`absolute left-0 h-0.5 w-5 rounded bg-current transition-transform ${open ? 'top-1.5 -rotate-45' : 'top-2.5'}`} />
            </span>
          </button>
        </div>
      </div>

      <nav
        id="mobile-nav"
        aria-label="Mobile"
        hidden={!open}
        className="shell border-t border-line pb-6 pt-2 md:hidden"
      >
        {NAV.map(item => (
          <Link key={item.href} href={item.href} className="block border-b border-line py-4 text-lg font-bold">
            {item.label}
          </Link>
        ))}
        <Link href="/contact" className="mt-5 flex h-12 items-center justify-center gap-2 rounded-full bg-copper-600 font-bold text-white">
          Request demo <Arrow />
        </Link>
      </nav>
    </header>
  )
}

export function Arrow({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" className={className}>
      <path d="M4.5 11.5 11.5 4.5M6 4.5h5.5V10" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
