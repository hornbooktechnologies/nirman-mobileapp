'use client'

import Image from 'next/image'
import { useEffect, useRef, type RefObject } from 'react'
import { mdiCalendarCheckOutline, mdiCheck, mdiPackageVariantClosed, mdiWalletOutline } from '@mdi/js'
import Icon from '@/components/ui/Icon'
import logo from '@/assets/brand/horizontal-logo.png'
import { Eyebrow, Title, span, useLoop, useReducedMotion, useViewport } from './kit'

const LOOP = 15
// the three facts that get picked out of the diary and the chat and filed in NirmanSite
const FACTS = [
  { chip: '₹500 advance', row: 'Kharchi', value: 'Ramesh · ₹500 paid', icon: mdiWalletOutline },
  { chip: '50 bags cement', row: 'Materials', value: 'Cement · 50 bags received', icon: mdiPackageVariantClosed },
  { chip: '12 workers', row: 'Attendance', value: '12 workers present', icon: mdiCalendarCheckOutline },
]
const LAUNCH = (i: number) => 7.2 + i * 0.5 // chip i leaves its source
const FLIGHT = 1.1
const STAMPS: [string, number][] = [['Recorded.', 10.3], ['Organised.', 10.9], ['In view.', 11.5]]

// highlighter pen, swept in behind a phrase once it is picked
const MARK = 'bg-[linear-gradient(transparent_56%,rgb(216_128_50/0.38)_56%)] bg-no-repeat transition-[background-size] duration-500 ease-out'

/** typed text: both parts appear character by character between a and b; the second part is the phrase that gets picked */
function Typed({ t, a, b, parts, pick, marked }: { t: number; a: number; b: number; parts: [string, string]; pick: RefObject<HTMLSpanElement | null>; marked: boolean }) {
  const n = Math.round(span(t, a, b) * (parts[0].length + parts[1].length))
  const lead = parts[0].slice(0, n)
  const mark = parts[1].slice(0, Math.max(0, n - parts[0].length))
  return (
    <>
      {lead}
      <span ref={pick} className={MARK} style={{ backgroundSize: marked ? '100% 100%' : '0% 100%' }}>
        {mark}
      </span>
    </>
  )
}

export default function Scattered() {
  const reduced = useReducedMotion()
  const { ref, visible } = useViewport<HTMLDivElement>('0px', 0.35)
  const { t: clock } = useLoop(LOOP, visible && !reduced)
  const t = reduced ? 13 : clock
  const sources = [useRef<HTMLSpanElement>(null), useRef<HTMLSpanElement>(null), useRef<HTMLSpanElement>(null)]
  const targets = [useRef<HTMLDivElement>(null), useRef<HTMLDivElement>(null), useRef<HTMLDivElement>(null)]
  const chips = [useRef<HTMLSpanElement>(null), useRef<HTMLSpanElement>(null), useRef<HTMLSpanElement>(null)]
  const prev = useRef(0)

  // fly each chip from its highlighted phrase to its NirmanSite row (measured, so it works in any layout)
  useEffect(() => {
    const stage = ref.current
    if (!stage) return
    const before = prev.current
    prev.current = t
    FACTS.forEach((_, i) => {
      const chip = chips[i].current, from = sources[i].current, to = targets[i].current
      if (!chip || !from || !to) return
      if (t < before) chip.getAnimations().forEach(a => a.cancel()) // loop restarted
      const go = LAUNCH(i)
      if (!(before < go && t >= go)) return
      const s = stage.getBoundingClientRect(), a = from.getBoundingClientRect(), b = to.getBoundingClientRect()
      const x0 = a.left - s.left, y0 = a.top - s.top + a.height / 2 - 15
      const x1 = b.left - s.left + 16, y1 = b.top - s.top + b.height / 2 - 15
      chip.animate(
        [
          { transform: `translate(${x0}px, ${y0}px) scale(0.9)`, opacity: 0 },
          { transform: `translate(${x0}px, ${y0 - 10}px) scale(1)`, opacity: 1, offset: 0.12 },
          { transform: `translate(${x1}px, ${y1}px) scale(1)`, opacity: 1, offset: 0.9 },
          { transform: `translate(${x1}px, ${y1}px) scale(0.96)`, opacity: 0 },
        ],
        { duration: FLIGHT * 1000, easing: 'cubic-bezier(0.65, 0, 0.35, 1)', fill: 'forwards' },
      )
    })
  })

  const marked = t >= 6.4 // phrases highlighted, ready to be collected
  const dim = t >= 9.6 && t < 14.3
  const out = t >= 14.3 // fade back before the loop starts over

  return (
    <section id="product" aria-labelledby="scattered-title" className="relative scroll-mt-20 overflow-hidden bg-paper py-[clamp(84px,10vw,140px)]">
      <div className="shell">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] lg:items-end lg:gap-16">
          <div>
            <Eyebrow>01 / From scattered to connected</Eyebrow>
            <Title id="scattered-title" className="mt-5 text-coffee">
              The work is on site.
              <br />
              The records are everywhere.
            </Title>
          </div>
          <p className="max-w-[42ch] text-[17px] font-medium leading-relaxed text-ink/75 lg:justify-self-end lg:pb-3">
            A register here. A message there. A number you’re trying to remember. Give your important site information a place of its own.
          </p>
        </div>

        <div ref={ref} className="relative mt-[clamp(48px,6vw,80px)] grid gap-y-10 md:grid-cols-[1.05fr_0.9fr_1.1fr] md:items-start md:gap-x-[clamp(20px,3vw,48px)]" aria-label="How scattered site records become organised records in NirmanSite">
          {/* ---- the site diary ---- */}
          <figure className="relative w-[94%] max-w-[420px] transition-opacity duration-700 md:w-auto" style={{ opacity: dim ? 0.42 : 1 }}>
            <div className="relative -rotate-[2.5deg] overflow-hidden rounded-[6px_18px_18px_6px] bg-[#fbf3e2] shadow-[0_30px_60px_-30px_rgb(42_33_27/0.45),inset_9px_0_0_rgb(42_33_27/0.07)]">
              <div aria-hidden="true" className="absolute inset-0 bg-[repeating-linear-gradient(180deg,transparent_0_37px,rgb(42_33_27/0.09)_37px_38px)] bg-[position:0_19px]" />
              <div aria-hidden="true" className="absolute inset-y-0 left-[46px] w-[1.5px] bg-copper/40" />
              <div className="relative min-h-[270px] pb-12 pl-[58px] pr-4 pt-[20px] md:min-h-[300px] md:pl-[62px] font-[family-name:var(--font-hand)] text-[#3e2e1b]">
                <p className="h-[38px] text-[15px] leading-[38px] text-[#7a6751] md:text-[17px]">Mon, 14 Sep — Sabarmati</p>
                <p className="h-[38px] whitespace-nowrap text-[19px] leading-[38px] md:text-[21px] lg:text-[23px]">
                  <Typed t={out ? 0 : t} a={0.4} b={2} parts={['Ramesh — ', 'Rs 500 advance']} pick={sources[0]} marked={marked && !out} />
                </p>
                <p className="h-[38px] whitespace-nowrap text-[19px] leading-[38px] md:text-[21px] lg:text-[23px]">
                  <Typed t={out ? 0 : t} a={2.3} b={3.9} parts={['', '50 bags cement']} pick={sources[1]} marked={marked && !out} />
                  {!out && t >= 3.9 ? ' received' : ''}
                </p>
                <p className="h-[38px] whitespace-nowrap text-[18px] leading-[38px] text-[#3e2e1b]/40 md:text-[19px] lg:text-[21px]">JCB diesel?? ask Mukesh</p>
              </div>
              <figcaption className="absolute bottom-4 left-5 text-[11px] font-extrabold uppercase tracking-[0.14em] text-[#8a775f]">In the site diary</figcaption>
            </div>
          </figure>

          {/* ---- a message thread ---- */}
          <figure className="relative ml-auto w-[80%] max-w-[340px] transition-opacity duration-700 max-md:-mt-24 max-md:z-10 md:ml-0 md:mt-16 md:w-auto" style={{ opacity: dim ? 0.42 : 1 }}>
            <div className="rounded-[22px] border border-coffee/10 bg-cream p-3.5 shadow-[0_24px_50px_-30px_rgb(42_33_27/0.45)]">
              <div className="flex items-center gap-2.5 border-b border-coffee/[0.08] pb-3">
                <span className="grid size-8 place-items-center rounded-full bg-sand text-[11px] font-extrabold text-coffee">SS</span>
                <span className="leading-tight">
                  <span className="block text-[13px] font-bold text-coffee">Sabarmati site group</span>
                  <span className="block text-[11px] font-semibold text-muted">14 members</span>
                </span>
              </div>
              <div className="flex min-h-[150px] flex-col justify-end gap-2.5 pt-3">
                <p
                  className="max-w-[220px] self-start rounded-[4px_14px_14px_14px] border border-coffee/[0.08] bg-white px-3 py-2.5 text-[13.5px] font-semibold leading-snug text-coffee transition-all duration-500"
                  style={{ opacity: !out && t >= 4.4 ? 1 : 0, translate: !out && t >= 4.4 ? '0 0' : '0 10px' }}
                >
                  <span className="mb-0.5 block text-[10.5px] font-extrabold text-copper-700">Owner</span>
                  How many workers were on site today?
                </p>
                <p
                  className="self-end rounded-[14px_4px_14px_14px] bg-sage px-3 py-2.5 text-[13.5px] font-semibold text-coffee transition-all duration-500"
                  style={{ opacity: !out && t >= 5.4 ? 1 : 0, translate: !out && t >= 5.4 ? '0 0' : '0 10px' }}
                >
                  <span className="mb-0.5 block text-[10.5px] font-extrabold text-olive-700">Supervisor</span>
                  <span ref={sources[2]} className={MARK} style={{ backgroundSize: marked && !out ? '100% 100%' : '0% 100%' }}>
                    12 workers
                  </span>{' '}
                  today, I think
                </p>
              </div>
            </div>
            <figcaption className="mt-3 pl-1 text-[11px] font-extrabold uppercase tracking-[0.14em] text-[#8a775f]">In a conversation</figcaption>
          </figure>

          {/* ---- the same facts, filed in NirmanSite ---- */}
          <figure className="relative w-full max-w-[440px] md:max-w-none">
            <div className="overflow-hidden rounded-[24px] border border-coffee/10 bg-cream shadow-[0_34px_70px_-36px_rgb(42_33_27/0.5)]">
              <div className="flex h-[62px] items-center justify-between border-b border-coffee/[0.08] bg-white px-5">
                <Image src={logo} alt="NirmanSite" height={26} className="h-[26px] w-auto" />
                <span className="text-[11.5px] font-bold text-muted">Sabarmati site · 14 Sep</span>
              </div>
              <div className="flex flex-col gap-2 p-3">
                {FACTS.map((f, i) => {
                  const done = !out && t >= LAUNCH(i) + FLIGHT * 0.9
                  return (
                    <div
                      key={f.row}
                      ref={targets[i]}
                      className={`flex h-[62px] items-center gap-3 rounded-[14px] border px-3.5 transition-[background-color,border-color] duration-500 ${done ? 'border-olive/30 bg-white' : 'border-coffee/[0.08] bg-white/50'}`}
                    >
                      <span className={`grid size-8 shrink-0 place-items-center rounded-lg transition-colors duration-500 ${done ? 'bg-olive text-white' : 'bg-coffee/[0.06] text-muted'}`}>
                        <Icon path={f.icon} size={17} />
                      </span>
                      <span className="min-w-0 flex-1 leading-tight">
                        <span className="block text-[10.5px] font-extrabold uppercase tracking-[0.12em] text-muted">{f.row}</span>
                        <span className="relative mt-1 block h-[18px]">
                          <span className={`absolute inset-y-0 left-0 w-[70%] rounded-md border-[1.5px] border-dashed border-coffee/15 transition-opacity duration-300 ${done ? 'opacity-0' : 'opacity-100'}`} />
                          <span className={`absolute inset-0 truncate text-[14px] font-bold text-coffee transition-opacity duration-500 ${done ? 'opacity-100' : 'opacity-0'}`}>{f.value}</span>
                        </span>
                      </span>
                      <span className={`grid size-6 shrink-0 place-items-center rounded-full text-white transition-colors duration-500 ${done ? 'bg-olive' : 'bg-coffee/[0.1]'}`}>
                        <Icon path={mdiCheck} size={14} />
                      </span>
                    </div>
                  )
                })}
              </div>
              <div className="flex gap-4 px-5 pb-5 pt-2 font-[family-name:var(--font-display)] text-[26px] leading-none">
                {STAMPS.map(([w, at]) => (
                  <span key={w} className={`transition-colors duration-500 ${!out && t >= at ? 'text-olive-700' : 'text-coffee/15'}`}>
                    {w}
                  </span>
                ))}
              </div>
            </div>
            <figcaption className="mt-3 pl-1 text-[11px] font-extrabold uppercase tracking-[0.14em] text-[#8a775f]">In NirmanSite · your site records, connected</figcaption>
          </figure>

          {/* chips in flight (decorative: the rows above carry the same text) */}
          {FACTS.map((f, i) => (
            <span
              key={f.chip}
              ref={chips[i]}
              aria-hidden="true"
              className="pointer-events-none absolute left-0 top-0 z-20 whitespace-nowrap rounded-lg bg-copper-600 px-3 py-1.5 text-[13px] font-extrabold text-white opacity-0 shadow-[0_12px_26px_-10px_rgb(169_90_34/0.7)]"
            >
              {f.chip}
            </span>
          ))}
        </div>
      </div>
    </section>
  )
}
