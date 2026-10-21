'use client'

import Image from 'next/image'
import PhoneFrame from '@/components/devices/Phone'
import { Eyebrow, Title, useLoop, useReducedMotion, useViewport } from './kit'
import mLanguage from '@/assets/screens/mobile/language.webp'

// the language rows on the real language screen (fractions of the screen), and a small preview in each language
const LANGS = [
  { label: 'English', lang: 'en', row: 0.733, site: 'Sabarmati site · Today', present: 'Workers present', kharchi: 'Kharchi today', materials: 'Material requests' },
  { label: 'हिन्दी', lang: 'hi', row: 0.806, site: 'साबरमती साइट · आज', present: 'काम पर उपस्थित', kharchi: 'आज की खर्ची', materials: 'सामान की माँग' },
  { label: 'ગુજરાતી', lang: 'gu', row: 0.882, site: 'સાબરમતી સાઇટ · આજે', present: 'કામ પર હાજર', kharchi: 'આજની ખર્ચી', materials: 'સામાનની માંગ' },
]
const STEP = 3.6

export default function Language() {
  const reduced = useReducedMotion()
  const { ref, visible } = useViewport<HTMLDivElement>('0px', 0.3)
  const { t, seek } = useLoop(STEP * LANGS.length, visible && !reduced)
  const active = Math.floor(t / STEP) % LANGS.length

  return (
    <section aria-labelledby="lang-title" className="overflow-hidden bg-paper py-[clamp(84px,10vw,140px)]">
      <div ref={ref} className="shell grid items-center gap-14 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-[clamp(48px,6vw,110px)]">
        <div>
          <Eyebrow>06 / Feels like your language</Eyebrow>
          <Title id="lang-title" className="mt-5 text-coffee">
            Built for your work. In words that feel like home.
          </Title>
          <p className="mt-6 max-w-[44ch] text-[17px] font-medium leading-relaxed text-ink/75">
            English, Hindi and Gujarati. A simple, approachable app for people who have a site to run.
          </p>
          <div role="radiogroup" aria-label="Preview language" className="mt-8 inline-flex gap-1 rounded-2xl border border-coffee/[0.12] bg-cream p-1.5">
            {LANGS.map((l, i) => (
              <button
                key={l.lang}
                type="button"
                role="radio"
                aria-checked={i === active}
                lang={l.lang}
                onClick={() => seek(i * STEP)}
                className={`cursor-pointer rounded-xl px-5 py-2.5 text-[15px] font-bold transition-colors duration-300 ${i === active ? 'bg-coffee text-cream' : 'text-ink/70 hover:text-coffee'}`}
              >
                {l.label}
              </button>
            ))}
          </div>
          <p className="mt-4 text-[13px] font-semibold text-muted">Familiar language. Everyday confidence.</p>
        </div>

        <div className="relative mx-auto flex w-full max-w-[560px] flex-col items-center gap-8 sm:block">
          {/* the real language setting in the mobile app */}
          <div className="relative w-[min(62vw,260px)] sm:ml-auto sm:mr-[6%]">
            <PhoneFrame>
              <Image src={mLanguage} alt="Language setting in the NirmanSite app: device language, English, Hindi and Gujarati" sizes="(min-width: 1024px) 260px, 58vw" quality={90} className="block h-auto w-full" />
              <span
                aria-hidden="true"
                className="absolute left-[4.8%] right-[5.4%] h-[6.2%] -translate-y-1/2 rounded-[10px] ring-2 ring-copper transition-[top] duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]"
                style={{ top: `${LANGS[active].row * 100}%` }}
              />
            </PhoneFrame>
          </div>

          {/* a small preview of the working day, in the chosen language */}
          <div className="w-[min(86vw,300px)] sm:absolute sm:left-[4%] sm:top-[8%] sm:w-[250px] lg:left-[9%]">
            <div className="relative">
            {LANGS.map((l, i) => (
              <div
                key={l.lang}
                lang={l.lang}
                aria-hidden={i !== active}
                className="rounded-[22px] bg-coffee p-5 text-cream shadow-[0_30px_60px_-28px_rgb(42_33_27/0.7)] transition-[opacity,translate] duration-500 [&:not(:first-child)]:absolute [&:not(:first-child)]:inset-0"
                style={{ opacity: i === active ? 1 : 0, translate: i === active ? '0 0' : '0 10px' }}
              >
                <p className="text-[12.5px] font-semibold text-cream/60">{l.site}</p>
                <p className="mt-3 text-[15px] font-bold">{l.present}</p>
                <p className="text-[44px] font-extrabold leading-none tracking-[-0.02em]">
                  5 <span className="text-cream/40">/ 5</span>
                </p>
                <div className="mt-4 grid grid-cols-2 gap-2">
                  <div className="rounded-xl bg-cream/[0.08] p-2.5">
                    <p className="text-[11.5px] font-semibold text-cream/65">{l.kharchi}</p>
                    <p className="mt-0.5 text-[17px] font-extrabold">₹500</p>
                  </div>
                  <div className="rounded-xl bg-copper-400/25 p-2.5">
                    <p className="text-[11.5px] font-semibold text-[#ffd2ad]">{l.materials}</p>
                    <p className="mt-0.5 text-[17px] font-extrabold">2</p>
                  </div>
                </div>
              </div>
            ))}
            </div>
            <p className="mt-3 text-[11px] font-bold uppercase tracking-[0.14em] text-muted">Language preview</p>
          </div>
        </div>
      </div>
    </section>
  )
}
