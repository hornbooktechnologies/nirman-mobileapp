'use client'

import Link from 'next/link'
import { Arrow } from '@/components/site/Header'
import FilmTrigger from '@/components/hero/FilmButton'
import { mdiPlay } from '@mdi/js'
import Icon from '@/components/ui/Icon'
import { useLoop, useReducedMotion, useViewport } from './kit'

const FLOORS = [300, 262, 224, 186, 92] // a building going up, floor by floor
const LOOP = 10

export default function FinalCta() {
  const reduced = useReducedMotion()
  const { ref, visible } = useViewport<HTMLDivElement>('0px', 0.35)
  const { t: clock } = useLoop(LOOP, visible && !reduced)
  const t = reduced ? 8 : clock
  const done = t >= 6.3 && t < 9.4

  return (
    <section aria-labelledby="cta-title" className="bg-cream pb-[clamp(72px,8vw,120px)] pt-6">
      <div ref={ref} className="shell">
        <div className="relative grid items-center gap-10 overflow-hidden rounded-[32px] bg-[linear-gradient(140deg,#2a211b_0%,#3a2d22_58%,#4f5637_140%)] px-[clamp(24px,5vw,72px)] py-[clamp(56px,7vw,96px)] lg:grid-cols-[minmax(0,1fr)_380px]">
          <div aria-hidden="true" className="absolute inset-0 bg-[linear-gradient(rgb(247_245_239/0.05)_1px,transparent_1px),linear-gradient(90deg,rgb(247_245_239/0.05)_1px,transparent_1px)] bg-[size:40px_40px]" />
          <div className="relative">
            <p className="text-[12.5px] font-extrabold uppercase tracking-[0.2em] text-copper-400">Your next day on site could feel different</p>
            <h2 id="cta-title" className="mt-5 text-balance font-[family-name:var(--font-display)] text-[clamp(42px,5vw,72px)] font-normal leading-[0.98] text-cream">
              Your way of building. <em className="text-copper-400">A little more organised.</em>
            </h2>
            <p className="mt-6 max-w-[40ch] text-[17px] font-medium leading-relaxed text-cream/70">Discover where NirmanSite fits into your day.</p>
            <div className="mt-9 flex flex-wrap items-center gap-3">
              <Link href="/contact" className="group inline-flex h-[54px] cursor-pointer items-center gap-2 rounded-full bg-copper-600 px-7 text-[15.5px] font-bold text-white transition-colors duration-200 hover:bg-[#96501e]">
                Request demo
                <Arrow className="transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
              </Link>
              <FilmTrigger className="inline-flex h-[54px] items-center gap-2.5 rounded-full border border-cream/25 px-6 text-[15.5px] font-bold text-cream transition-colors hover:border-cream/60">
                <Icon path={mdiPlay} size={20} />
                Watch the 30-sec film
              </FilmTrigger>
            </div>
          </div>

          {/* a small building rising floor by floor */}
          <div aria-hidden="true" className="relative mx-auto flex h-[300px] w-full max-w-[380px] flex-col-reverse items-center pb-[26px] max-lg:hidden">
            <span className="absolute inset-x-4 bottom-[26px] h-[1.5px] bg-cream/35" />
            {FLOORS.map((w, i) => (
              <span key={w} className="relative h-[46px] border-[1.5px] border-b-0 border-dashed border-cream/25" style={{ width: w }}>
                <span
                  className={`absolute inset-0 origin-bottom ${i === FLOORS.length - 1 ? 'bg-copper' : i % 2 ? 'bg-cream/20' : 'bg-cream/30'}`}
                  style={{ scale: `1 ${t >= 0.8 + i * 1.05 && t < 9.4 ? 1 : 0}`, transition: 'scale 0.7s cubic-bezier(0.2, 0.8, 0.2, 1)' }}
                />
              </span>
            ))}
            <span
              className="absolute right-2 top-2 flex items-center gap-2 rounded-full bg-[#8fce9e]/15 px-3 py-2 text-[12.5px] font-bold text-[#a9dcb4] transition-[opacity,translate] duration-500"
              style={{ opacity: done ? 1 : 0, translate: done ? '0 0' : '0 8px' }}
            >
              <span className="size-2 rounded-full bg-[#8fce9e]" />
              Handover ready
            </span>
          </div>
        </div>
      </div>
    </section>
  )
}
