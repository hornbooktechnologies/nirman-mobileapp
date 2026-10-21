import Link from 'next/link'
import { Arrow } from '@/components/site/Header'

/** top padding for inner pages: clears the fixed 72px header, then the usual section breathing room */
export const PAGE_TOP = 'pt-[calc(72px+clamp(44px,6.5vw,96px))]'

/** body copy used across the company pages */
export const BODY = 'text-[17px] font-medium leading-relaxed text-ink/75'
/** the larger, darker lead sentence that opens a block */
export const LEAD = 'text-[clamp(19px,1.55vw,22px)] font-semibold leading-snug tracking-[-0.01em] text-coffee'

/** the dotted "site plan" sheet the landing page uses behind its diagrams */
export function Blueprint({ children, className = '', mark = 'N / Site plan — 01' }: { children: React.ReactNode; className?: string; mark?: string | null }) {
  return (
    <div
      className={`relative overflow-hidden rounded-[28px] border border-coffee/[0.08] bg-paper bg-[radial-gradient(rgb(42_33_27/0.11)_1px,transparent_1px)] bg-[size:22px_22px] ${className}`}
    >
      {mark && (
        <span aria-hidden="true" className="absolute left-6 top-5 z-10 text-[11px] font-extrabold uppercase tracking-[0.18em] text-muted">
          {mark}
        </span>
      )}
      {children}
    </div>
  )
}

/** primary copper pill, same as the header / final CTA buttons */
export function PillLink({ href, children, className = '' }: { href: string; children: React.ReactNode; className?: string }) {
  const cls = `group inline-flex h-[54px] cursor-pointer items-center gap-2 rounded-full bg-copper-600 px-7 text-[15.5px] font-bold text-white transition-colors duration-200 hover:bg-[#96501e] ${className}`
  const inner = (
    <>
      {children}
      <Arrow className="transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
    </>
  )
  return href.startsWith('/') ? (
    <Link href={href} className={cls}>
      {inner}
    </Link>
  ) : (
    <a href={href} className={cls}>
      {inner}
    </a>
  )
}

/** closing invitation on About (dark panel, same family as the landing page's final CTA) */
export function CompanyCta() {
  return (
    <section aria-labelledby="company-cta-title" className="bg-cream pb-[clamp(72px,8vw,120px)] pt-6">
      <div className="shell">
        <div className="relative overflow-hidden rounded-[32px] bg-[linear-gradient(140deg,#2a211b_0%,#3a2d22_58%,#4f5637_140%)] px-[clamp(24px,5vw,72px)] py-[clamp(56px,7vw,96px)] text-center">
          <div aria-hidden="true" className="absolute inset-0 bg-[linear-gradient(rgb(247_245_239/0.05)_1px,transparent_1px),linear-gradient(90deg,rgb(247_245_239/0.05)_1px,transparent_1px)] bg-[size:40px_40px]" />
          <div className="relative flex flex-col items-center">
            <p className="text-[12.5px] font-extrabold uppercase tracking-[0.2em] text-copper-400">Let’s start with your working day</p>
            <h2 id="company-cta-title" className="mt-5 text-balance font-[family-name:var(--font-display)] text-[clamp(42px,5vw,72px)] font-normal leading-[0.98] text-cream">
              Your site has a story.
              <br />
              <em className="text-copper-400">We’re here to listen.</em>
            </h2>
            <PillLink href="/contact" className="mt-9">
              Talk to our team
            </PillLink>
          </div>
        </div>
      </div>
    </section>
  )
}
