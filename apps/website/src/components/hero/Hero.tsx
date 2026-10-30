'use client'

import Image, { getImageProps, type StaticImageData } from 'next/image'
import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { mdiArrowDown, mdiCalendarCheckOutline, mdiCashMultiple, mdiChartTimelineVariant, mdiPackageVariantClosed, mdiPlay } from '@mdi/js'
import Icon from '@/components/ui/Icon'
import { Arrow } from '@/components/site/Header'
import FilmTrigger from './FilmButton'
import Phone3D, { type RollScreen } from './Phone3D'

import dFar from '@/assets/scene/desktop-far.webp'
import dBuilding from '@/assets/scene/desktop-building.webp'
import dGrass from '@/assets/scene/desktop-grass.webp'
import dLoad from '@/assets/scene/desktop-load.webp'
import mFar from '@/assets/scene/mobile-far.webp'
import mBuilding from '@/assets/scene/mobile-building.webp'
import mGrass from '@/assets/scene/mobile-grass.webp'
import mLoad from '@/assets/scene/mobile-load.webp'
import scene from '@/assets/scene/scene.json'
import thumb from '@/assets/brand/film-thumb.webp'
import sWorkers from '@/assets/screens/mobile/workers-listing.webp'
import sAttendance from '@/assets/screens/mobile/attendance.webp'
import sKharchi from '@/assets/screens/mobile/kharchi-adjustment.webp'
import sWages from '@/assets/screens/mobile/wages.webp'
import sProgress from '@/assets/screens/mobile/project-progress.webp'
import sSales from '@/assets/screens/mobile/sales-leads.webp'

const SCREENS: RollScreen[] = [
  { src: sAttendance, label: 'Attendance', alt: 'NirmanSite app: daily site roster for attendance' },
  { src: sWorkers, label: 'Workers', alt: 'NirmanSite app: project workers with trades and daily rates' },
  { src: sKharchi, label: 'Kharchi', alt: 'NirmanSite app: Kharchi (worker advance) detail' },
  { src: sWages, label: 'Wages', alt: 'NirmanSite app: calculating wages for a period' },
  { src: sProgress, label: 'Progress', alt: 'NirmanSite app: construction stages and progress' },
  { src: sSales, label: 'Sales', alt: 'NirmanSite app: sales leads and their stages' },
]

type Framing = keyof typeof scene
type SpotId = keyof typeof scene.desktop.spots
type Side = 'left' | 'right'

// values mirror the real app screens (demo project data)
const SPOTS: { id: SpotId; icon: string; title: string; value: string; note: string; side: Side }[] = [
  { id: 'attendance', icon: mdiCalendarCheckOutline, title: 'Attendance', value: '5 of 5 present today', note: 'Only absences and half-days recorded', side: 'right' },
  { id: 'progress', icon: mdiChartTimelineVariant, title: 'Progress', value: '1 of 9 stages updated', note: 'Latest: Foundation at 25%', side: 'right' },
  { id: 'materials', icon: mdiPackageVariantClosed, title: 'Materials', value: '2 requests · 1 overdue', note: 'Quantity and required-by date on each', side: 'right' },
  { id: 'wages', icon: mdiCashMultiple, title: 'Wages', value: 'Batch ready to review', note: 'Preview before you confirm', side: 'left' },
]

const cabin = scene.desktop.spots.attendance // the card's callout ends at the site-cabin hotspot

// the crane lifts its load by a share of the scene frame, and the materials hotspot rides along
const HOIST = 'motion-safe:animate-[hoist_18s_ease-in-out_infinite]'
const LIFT: Record<Framing, string> = { desktop: '-5%', mobile: '-3.5%' }

// next/image hints: the landscape frame is max(100vw, 2.2 × hero height) wide, the portrait one max(100vw, 0.62 × height)
const SIZES: Record<Framing, { layer: string; load: string }> = {
  desktop: { layer: '(min-aspect-ratio: 11/5) 100vw, (min-aspect-ratio: 16/9) 124vw, (min-aspect-ratio: 8/5) 138vw, 165vw', load: '9vw' },
  mobile: { layer: '(min-aspect-ratio: 31/50) 100vw, 135vw', load: '17vw' },
}

/** pointer + scroll parallax: each layer moves by its own depth (CSS variables set by the loop below) */
const par = (d: number, s: number) =>
  ({ translate: `calc(var(--mx, 0) * ${d}px) calc(var(--my, 0) * ${d * 0.45}px + var(--sy, 0) * ${s}px)` }) as React.CSSProperties

/** one scene layer: the landscape render on landscape screens, the portrait render otherwise (only one is downloaded) */
export function Layer({ d, m }: { d: StaticImageData; m: StaticImageData }) {
  const common = { alt: '', fill: true, quality: 75, loading: 'eager', fetchPriority: 'high' } as const
  const desktop = getImageProps({ ...common, src: d, sizes: SIZES.desktop.layer }).props
  const mobile = getImageProps({ ...common, src: m, sizes: SIZES.mobile.layer }).props
  return (
    <picture>
      <source media="(min-aspect-ratio: 1/1)" srcSet={desktop.srcSet} sizes={SIZES.desktop.layer} />
      <img
        src={mobile.src}
        srcSet={mobile.srcSet}
        sizes={mobile.sizes}
        alt={mobile.alt}
        style={mobile.style}
        loading={mobile.loading}
        fetchPriority={mobile.fetchPriority}
        decoding={mobile.decoding}
        className="object-cover"
        draggable={false}
      />
    </picture>
  )
}

/** the crane's load on its hoist ropes; clipped at the trolley, so lifting it shortens the ropes */
function Load({ set, img, className = '' }: { set: Framing; img: StaticImageData; className?: string }) {
  const { trolley, load } = scene[set]
  const [x, y, w, h] = load
  return (
    <div className={`absolute inset-0 ${className}`} style={{ clipPath: `inset(${trolley * 100}% 0 0 0)` }}>
      <div className={`absolute inset-0 ${HOIST}`} style={{ '--lift': LIFT[set] } as React.CSSProperties}>
        <div className="absolute" style={{ left: `${x * 100}%`, top: `${y * 100}%`, width: `${w * 100}%`, height: `${h * 100}%` }}>
          <Image src={img} alt="" fill sizes={SIZES[set].load} quality={90} draggable={false} />
        </div>
      </div>
    </div>
  )
}

function Hotspots({ set, only, sides = {} }: { set: Framing; only?: SpotId[]; sides?: Partial<Record<SpotId, Side>> }) {
  // the site-cabin hotspot sits where the phone card is on narrower landscape screens
  const [roomy, setRoomy] = useState(true)
  useEffect(() => {
    const m = window.matchMedia('(min-width: 1024px) and (min-aspect-ratio: 3/2)')
    const sync = () => setRoomy(m.matches)
    sync()
    m.addEventListener('change', sync)
    return () => m.removeEventListener('change', sync)
  }, [])
  const list = SPOTS.filter(s => (!only || only.includes(s.id)) && (set !== 'desktop' || roomy || s.id !== 'attendance')).map(s => ({ ...s, side: sides[s.id] ?? s.side }))
  const [open, setOpen] = useState(0)
  const [hold, setHold] = useState(false)
  useEffect(() => {
    if (hold || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const id = window.setTimeout(() => setOpen(o => (o + 1) % list.length), 4200)
    return () => window.clearTimeout(id)
  }, [open, hold, list.length])
  const current = open % Math.max(1, list.length)

  return (
    <>
      {list.map((s, i) => {
        const [x, y] = scene[set].spots[s.id]
        const on = i === current
        const pos = s.side === 'right' ? 'left-5' : 'right-5'
        const spot = (
          <div
            key={s.id}
            className={`pointer-events-auto absolute ${on ? 'z-20' : 'z-10'}`}
            style={{ left: `${x * 100}%`, top: `${y * 100}%` }}
            onPointerEnter={() => {
              setHold(true)
              setOpen(i)
            }}
            onPointerLeave={() => setHold(false)}
          >
            <button
              type="button"
              onClick={() => setOpen(i)}
              onFocus={() => {
                setHold(true)
                setOpen(i)
              }}
              onBlur={() => setHold(false)}
              aria-expanded={on}
              aria-label={`${s.title}: ${s.value}`}
              className="absolute left-0 top-0 grid size-11 -translate-x-1/2 -translate-y-1/2 cursor-pointer place-items-center"
            >
              <span className="absolute size-4 rounded-full bg-white/80 motion-safe:animate-[ping_2.4s_cubic-bezier(0,0,0.2,1)_infinite]" />
              <span className={`relative size-4 rounded-full border-[3px] border-white shadow-[0_2px_10px_rgb(0_0_0/0.35)] transition-colors ${on ? 'bg-copper' : 'bg-white/60'}`} />
            </button>
            <div
              aria-hidden="true"
              className={`pointer-events-none absolute ${pos} top-1/2 w-max max-w-[250px] -translate-y-1/2 rounded-2xl bg-white/[0.94] p-3 pr-4 shadow-[0_18px_40px_-16px_rgb(42_33_27/0.45)] ring-1 ring-black/5 backdrop-blur-md transition-opacity duration-300 ${
                on ? 'opacity-100' : 'opacity-0'
              }`}
            >
              <div className="flex items-start gap-2.5">
                <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-copper-600 text-white">
                  <Icon path={s.icon} size={18} />
                </span>
                <span className="leading-tight">
                  <span className="block text-[10.5px] font-extrabold uppercase tracking-[0.14em] text-muted">{s.title}</span>
                  <span className="mt-0.5 block text-[14.5px] font-extrabold text-coffee">{s.value}</span>
                  <span className="mt-0.5 block text-[12px] font-medium text-ink/70">{s.note}</span>
                </span>
              </div>
            </div>
          </div>
        )
        // the materials spot marks the crane load, so it rides the hoist with it
        return s.id === 'materials' ? (
          <div key={s.id} className={`pointer-events-none absolute inset-0 ${on ? 'z-20' : 'z-10'} ${HOIST}`} style={{ '--lift': LIFT[set] } as React.CSSProperties}>
            {spot}
          </div>
        ) : (
          spot
        )
      })}
    </>
  )
}

export default function Hero() {
  const root = useRef<HTMLElement>(null)

  useEffect(() => {
    const el = root.current
    if (!el || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    let tx = 0, ty = 0, mx = 0, my = 0, raf = 0, visible = true
    const fine = window.matchMedia('(pointer: fine)').matches
    const onMove = (e: PointerEvent) => {
      tx = (e.clientX / window.innerWidth) * 2 - 1
      ty = (e.clientY / window.innerHeight) * 2 - 1
    }
    const frame = () => {
      raf = 0
      if (!visible) return
      mx += (tx - mx) * 0.07
      my += (ty - my) * 0.07
      el.style.setProperty('--mx', (-mx).toFixed(3))
      el.style.setProperty('--my', (-my).toFixed(3))
      el.style.setProperty('--sy', Math.min(1, Math.max(0, window.scrollY / el.offsetHeight)).toFixed(3))
      raf = requestAnimationFrame(frame)
    }
    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting
      if (visible && !raf) raf = requestAnimationFrame(frame)
    })
    io.observe(el)
    if (fine) window.addEventListener('pointermove', onMove, { passive: true })
    raf = requestAnimationFrame(frame)
    return () => {
      cancelAnimationFrame(raf)
      io.disconnect()
      window.removeEventListener('pointermove', onMove)
    }
  }, [])

  return (
    <section ref={root} aria-labelledby="hero-title" className="relative isolate h-[var(--hero-h)] overflow-hidden bg-[#e6e3de] [--hero-h:max(100svh,640px)]">
      {/* ---------- sky ---------- */}
      <div aria-hidden="true" className="absolute inset-0 bg-[linear-gradient(180deg,#d2dce5_0%,#e3e3df_40%,#ede2d2_70%,#eddcc6_100%)]" />
      <div aria-hidden="true" className="absolute -left-[12%] top-[34%] h-[70%] w-[62%] rounded-full bg-[radial-gradient(closest-side,rgb(255_230_198/0.8),rgb(255_230_198/0))]" style={par(3, 140)} />
      <div aria-hidden="true" className="absolute inset-0" style={par(2, 150)}>
        {[
          { l: '7%', t: '19%', w: 300, o: 0.75, d: '46s' },
          { l: '38%', t: '9%', w: 420, o: 0.55, d: '60s' },
          { l: '72%', t: '26%', w: 260, o: 0.5, d: '52s' },
        ].map((c, i) => (
          <div key={i} className="absolute motion-safe:animate-[cloud_var(--d)_ease-in-out_infinite_alternate]" style={{ left: c.l, top: c.t, ['--d' as string]: c.d }}>
            <div className="rounded-full bg-white blur-2xl" style={{ width: c.w, height: c.w * 0.32, opacity: c.o }} />
          </div>
        ))}
      </div>

      {/* ---------- scene: a 2.2:1 render anchored right on landscape screens (the building keeps its place),
                 a 0.62:1 render centred on portrait ones ---------- */}
      <div className="@container absolute bottom-0 left-1/2 aspect-[62/100] w-[max(100%,calc(var(--hero-h)*0.62))] -translate-x-1/2 [--card-h:26%] [--card-top:max(10.5%,calc(100%-var(--hero-h)+92px))] land:left-auto land:right-0 land:aspect-[2.2/1] land:w-[max(100%,calc(var(--hero-h)*2.2))] land:translate-x-0">
        <div aria-hidden="true" className="absolute inset-0" style={par(4, 120)}>
          <Layer d={dFar} m={mFar} />
        </div>
        {/* info card behind the building, like a panel the building grows out of (roomy screens only) */}
        <div
          className="absolute left-[52%] top-[var(--card-top)] hidden h-[var(--card-h)] w-[25%] rounded-[36px] bg-white/[0.88] p-[1.1%] shadow-[0_30px_80px_-40px_rgb(42_33_27/0.4)] ring-1 ring-white wide:block"
          style={par(8, 95)}
        >
          <div className="flex flex-wrap gap-1.5">
            {['Mobile app', 'Web workspace'].map(c => (
              <span key={c} className="rounded-full border border-coffee/15 px-2.5 py-1 text-[12px] font-bold text-ink/80">
                {c}
              </span>
            ))}
            <span className="rounded-full bg-coffee px-2.5 py-1 text-[12px] font-bold text-cream">Team roles</span>
          </div>
          {/* the copy keeps to the left part of the card: the building rises through the rest */}
          <div className="mt-[4%] max-w-[11.8cqw]">
            <p className="text-balance text-[clamp(18px,1.25cqw,30px)] font-medium leading-[1.15] tracking-[-0.02em] text-coffee">Every site record, in one app.</p>
            <p className="mt-2 text-balance text-[clamp(12.5px,0.62cqw,15px)] font-medium leading-normal text-muted">From daily attendance to wage settlement.</p>
          </div>
        </div>
        {/* callout from the card's lower edge down to the site cabin: dashes flow up, like records coming in */}
        <div
          aria-hidden="true"
          className="absolute top-[calc(var(--card-top)+var(--card-h))] hidden w-[1.5px] bg-[linear-gradient(to_bottom,rgb(255_255_255/0.95)_0_6px,transparent_6px)] bg-[length:100%_14px] motion-safe:animate-[dash-flow_1.4s_linear_infinite] wide:block"
          style={{ ...par(10, 90), left: `${cabin[0] * 100}%`, height: `calc(${cabin[1] * 100}% - var(--card-top) - var(--card-h))` }}
        >
          <span className="absolute -left-[2.75px] -top-[3px] size-[7px] rounded-full bg-white" />
        </div>
        <div aria-hidden="true" className="absolute inset-0" style={par(12, 80)}>
          <Layer d={dBuilding} m={mBuilding} />
          <Load set="desktop" img={dLoad} className="hidden land:block" />
          <Load set="mobile" img={mLoad} className="land:hidden" />
        </div>
        <div aria-hidden="true" className="absolute inset-0" style={par(22, 30)}>
          <Layer d={dGrass} m={mGrass} />
        </div>
        {/* portrait: fade the sky behind the headline */}
        <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-[56%] bg-[linear-gradient(180deg,rgb(222_227_230/0.95)_0%,rgb(226_227_223/0.78)_48%,rgb(227_227_223/0))] land:hidden" />
        <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 h-[30%] bg-[linear-gradient(to_top,rgb(31_24_17/0.72),rgb(31_24_17/0.3)_50%,rgb(31_24_17/0))] land:h-[34%]" />
        <div className="pointer-events-none absolute inset-0" style={par(12, 80)}>
          <div className="absolute inset-0 hidden land:block">
            <Hotspots set="desktop" />
          </div>
          <div className="absolute inset-0 land:hidden">
            <Hotspots set="mobile" only={['progress', 'wages']} sides={{ progress: 'right', wages: 'left' }} />
          </div>
        </div>
      </div>

      {/* ---------- headline ---------- */}
      <div className="pointer-events-none relative z-20 pt-[max(12vh,96px)] land:absolute land:inset-x-0 land:top-[max(16vh,104px)] land:pt-0">
        <div className="shell">
          <div className="pointer-events-auto w-fit">
            <h1
              id="hero-title"
              className="rise-in font-[family-name:var(--font-display)] text-[clamp(52px,13vw,76px)] font-normal leading-[0.9] tracking-[-0.015em] text-coffee land:text-[clamp(48px,min(5.8vw,11vh),116px)]"
            >
              Build more.
              <br />
              Chase <em className="text-copper">less.</em>
            </h1>
            <p className="rise-in mt-5 max-w-[34ch] text-balance text-[clamp(14.5px,1.05vw,18px)] font-medium text-ink/80 land:max-w-none" style={{ '--d': '80ms' } as React.CSSProperties}>
              / Construction management for builders &amp; contractors /
            </p>
            <div className="rise-in mt-7 flex flex-wrap items-center gap-3" style={{ '--d': '160ms' } as React.CSSProperties}>
              <Link href="/contact" className="group inline-flex h-[52px] cursor-pointer items-center gap-2 rounded-full bg-coffee px-7 text-[15px] font-bold tracking-[0.02em] text-cream transition-colors duration-200 hover:bg-[#3d3128]">
                Request demo
                <Arrow className="transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
              </Link>
              <FilmTrigger className="group inline-flex h-[52px] items-center gap-3 rounded-full bg-white/70 py-1 pl-1 pr-5 ring-1 ring-coffee/10 backdrop-blur-sm transition-colors hover:bg-white">
                <span className="relative block h-11 w-16 overflow-hidden rounded-full">
                  <Image src={thumb} alt="" fill sizes="64px" loading="eager" className="object-cover" />
                  <span className="absolute inset-0 grid place-items-center bg-black/25">
                    <Icon path={mdiPlay} size={18} className="text-white" />
                  </span>
                </span>
                <span className="text-[14.5px] font-bold text-coffee">Watch the 30-sec film</span>
              </FilmTrigger>
            </div>
          </div>
        </div>
      </div>

      {/* ---------- bottom row on the grass ---------- */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-30">
        <div className="shell grid items-end gap-6 wide:grid-cols-[minmax(0,1.05fr)_minmax(0,0.7fr)_minmax(0,1fr)]">
          <div className="pointer-events-auto relative h-[clamp(140px,20vh,210px)] max-w-[560px] overflow-visible rounded-t-[32px] bg-[#555e3d] px-6 pt-5 text-cream shadow-[0_-20px_60px_-30px_rgb(0_0_0/0.5)] md:px-7 md:pt-6">
            <p className="max-w-[15ch] font-[family-name:var(--font-display)] text-[clamp(24px,2vw,32px)] leading-[1.05]">Built for the people on site.</p>
            <p className="mt-2 max-w-[24ch] text-[13.5px] font-medium leading-snug text-cream/75">Attendance, Kharchi, wages and progress on one phone.</p>
            <Phone3D
              screens={SCREENS}
              sizes="(min-aspect-ratio: 1/1) 176px, 30vw"
              className="absolute bottom-[-18%] right-[5%] w-[clamp(104px,30vw,150px)] land:w-[clamp(104px,min(11.5vw,18vh),176px)]"
            />
          </div>
          <div className="pointer-events-auto hidden pb-9 text-cream wide:block">
            <p className="flex items-end gap-3">
              <span className="font-[family-name:var(--font-display)] text-[76px] italic leading-[0.8]">3</span>
              <span className="pb-1 text-[15px] font-semibold leading-tight">
                languages
                <br />
                <span className="text-cream/70">English · हिन्दी · ગુજરાતી</span>
              </span>
            </p>
          </div>
          <div className="pointer-events-auto hidden pb-9 text-cream wide:block">
            <p className="max-w-[22ch] text-[clamp(18px,1.55vw,26px)] font-semibold uppercase leading-[1.12] tracking-[0.02em]">From site to office, one connected workspace</p>
            <Link href="#product" className="mt-4 inline-flex cursor-pointer items-center gap-1.5 border-b border-cream/60 pb-0.5 text-[13px] font-bold uppercase tracking-[0.12em] text-cream hover:border-cream">
              See the app <Icon path={mdiArrowDown} size={15} />
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}
