'use client'

import Image from 'next/image'
import { mdiCheckDecagramOutline, mdiFolderOutline, mdiReceiptTextOutline } from '@mdi/js'
import Icon from '@/components/ui/Icon'
import TabletFrame from '@/components/devices/Tablet'
import { Eyebrow, Title, inr, span, useLoop, useReducedMotion, useViewport } from './kit'
import tExpenses from '@/assets/screens/tablet/expenses.webp'

const CHIPS = [
  { icon: mdiFolderOutline, label: 'Project-wise' },
  { icon: mdiCheckDecagramOutline, label: 'Approvals' },
  { icon: mdiReceiptTextOutline, label: 'Expense records' },
]
// where the approved badges sit on the tablet capture (fractions of the screen)
const APPROVED = [
  { x: 0.855, y: 0.522 },
  { x: 0.855, y: 0.633 },
]

export default function SiteMoney() {
  const reduced = useReducedMotion()
  const { ref, visible } = useViewport<HTMLDivElement>('0px', 0.3)
  // plays once when it comes into view, then holds
  const { t: clock } = useLoop(60, visible && !reduced)
  const t = reduced ? 60 : clock
  const spend = 25000 * span(t, 0.9, 2.4) ** 0.6

  return (
    <section aria-labelledby="money-title" className="overflow-hidden bg-paper py-[clamp(84px,10vw,140px)]">
      <div ref={ref} className="shell grid items-center gap-14 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-[clamp(48px,6vw,110px)]">
        <div>
          <Eyebrow>04 / From records to understanding</Eyebrow>
          <Title id="money-title" className="mt-5 text-coffee">
            Know where your site expenses go.
          </Title>
          <p className="mt-6 max-w-[44ch] text-[17px] font-medium leading-relaxed text-ink/75">
            Track construction site expenses by project and category. Review recognised spending, approval status and individual expense records, so the office has the context behind each recorded amount.
          </p>
          <ul className="mt-8 flex flex-wrap gap-2.5">
            {CHIPS.map(c => (
              <li key={c.label} className="inline-flex items-center gap-2 rounded-full border border-coffee/[0.12] bg-white px-4 py-2 text-[14px] font-bold text-coffee">
                <Icon path={c.icon} size={17} className="text-olive" />
                {c.label}
              </li>
            ))}
          </ul>
        </div>

        <div className="relative mx-auto w-[min(86vw,440px)] lg:mr-[6%]">
          <TabletFrame className="rotate-[1.5deg]">
            <Image src={tExpenses} alt="Site expenses in the NirmanSite app: recognised spend, pending approval and each expense with its status" sizes="(min-width: 1024px) 440px, 86vw" quality={90} className="block h-auto w-full" />
            {/* approved records get a soft ring */}
            {APPROVED.map((p, i) => (
              <span
                key={i}
                aria-hidden="true"
                className="absolute h-[3.2%] w-[15%] -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-olive transition-opacity duration-500 motion-safe:animate-pulse"
                style={{ left: `${p.x * 100}%`, top: `${p.y * 100}%`, opacity: t >= 2.8 + i * 0.3 ? 1 : 0 }}
              />
            ))}
          </TabletFrame>

          {/* callouts pinned to the screen */}
          <div
            className="absolute -left-[30%] top-[30%] rounded-2xl bg-white p-4 pr-6 shadow-[0_24px_50px_-24px_rgb(42_33_27/0.45)] ring-1 ring-coffee/[0.06] transition-[opacity,translate] duration-700 max-lg:-left-[4%] max-lg:top-[-4%]"
            style={{ opacity: t >= 0.6 ? 1 : 0, translate: t >= 0.6 ? '0 0' : '0 12px' }}
          >
            <p className="text-[10.5px] font-extrabold uppercase tracking-[0.14em] text-muted">Recognised spend</p>
            <p className="mt-1 text-[28px] font-extrabold tabular-nums tracking-[-0.02em] text-coffee">{inr(spend)}</p>
            <p className="text-[12px] font-semibold text-olive-700">Across this project</p>
          </div>
          <div
            className="absolute -right-[8%] top-[72%] flex items-center gap-2.5 rounded-2xl bg-coffee px-4 py-3 text-cream shadow-[0_24px_50px_-24px_rgb(42_33_27/0.6)] transition-[opacity,translate] duration-700 max-lg:-right-[3%]"
            style={{ opacity: t >= 3.2 ? 1 : 0, translate: t >= 3.2 ? '0 0' : '0 12px' }}
          >
            <span className="grid size-8 place-items-center rounded-lg bg-olive">
              <Icon path={mdiCheckDecagramOutline} size={18} />
            </span>
            <span className="leading-tight">
              <span className="block text-[14px] font-bold">Status on every record</span>
              <span className="block text-[12px] font-semibold text-cream/65">Approved, draft or pending</span>
            </span>
          </div>
        </div>
      </div>
    </section>
  )
}
