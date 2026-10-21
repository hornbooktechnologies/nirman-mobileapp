'use client'

import { mdiCheck } from '@mdi/js'
import Icon from '@/components/ui/Icon'
import PhoneFrame from '@/components/devices/Phone'
import { BrowserFrame, WebScreen, type WebShot } from '@/components/devices/Browser'
import PhoneFlow, { type FlowScreen } from './PhoneFlow'
import { Eyebrow, Title, useLoop, useReducedMotion, useViewport } from './kit'

import mWorkers from '@/assets/screens/mobile/workers-listing.webp'
import mAddWorker from '@/assets/screens/mobile/add-worker.webp'
import mAttendance from '@/assets/screens/mobile/attendance.webp'
import mMarkAbsent from '@/assets/screens/mobile/mark-absent.webp'
import mRecordKharchi from '@/assets/screens/mobile/record-kharchi.webp'
import mKharchiAdjust from '@/assets/screens/mobile/kharchi-adjustment.webp'
import mWages from '@/assets/screens/mobile/wages.webp'
import mWagesBatch from '@/assets/screens/mobile/wages-batch.webp'
import wAttendanceSide from '@/assets/screens/web/attendance-side.webp'
import wAttendanceTop from '@/assets/screens/web/attendance-top.webp'
import wAttendanceBody from '@/assets/screens/web/attendance-body.webp'
import wKharchiSide from '@/assets/screens/web/kharchi-side.webp'
import wKharchiTop from '@/assets/screens/web/kharchi-top.webp'
import wKharchiBody from '@/assets/screens/web/kharchi-body.webp'
import wWagesSide from '@/assets/screens/web/wages-side.webp'
import wWagesTop from '@/assets/screens/web/wages-top.webp'
import wWagesBody from '@/assets/screens/web/wages-body.webp'

type Moment = {
  day: string
  time: string
  title: string
  desc: string
  points: string[]
  note: string
  len: number
  screens: FlowScreen[]
  office: { shot: WebShot; alt: string; focus: string }
}

// each moment replays a real flow in the mobile app, beside the same records in the web workspace
const MOMENTS: Moment[] = [
  {
    day: 'Monday',
    time: '08:07',
    title: 'Labour attendance',
    desc: 'Add a new worker at the gate, then record only the exceptions. Everyone else is present by default.',
    points: ['Presence is automatic', 'Absences and half-days as exceptions', 'Trades, projects and daily rates'],
    note: 'Workers do not need app accounts.',
    len: 10,
    screens: [
      { src: mWorkers, alt: 'Team screen with project workers, their trades and daily rates', at: 0, taps: [{ at: 1.5, x: 0.896, y: 0.235 }] },
      { src: mAddWorker, alt: 'New worker form: name, trade, start date and daily rate', at: 2, enter: 'sheet', taps: [{ at: 4.1, x: 0.733, y: 0.928 }] },
      { src: mAttendance, alt: 'Mark attendance: the daily site roster with every worker present by default', at: 4.6, taps: [{ at: 6.7, x: 0.5, y: 0.926 }] },
      { src: mMarkAbsent, alt: 'Mark absent: record a full-day or half-day absence for one worker', at: 7.2, enter: 'sheet', taps: [{ at: 9.1, x: 0.73, y: 0.928 }] },
    ],
    office: { shot: { side: wAttendanceSide, top: wAttendanceTop, body: wAttendanceBody }, alt: 'Web workspace: attendance summary with expected, present and absent worker days', focus: '50% 38%' },
  },
  {
    day: 'Wednesday',
    time: '11:30',
    title: 'Kharchi',
    desc: 'Record the advance already paid to a worker. Its balance stays in view until wages settle it.',
    points: ['Every advance has a record', 'Corrections kept as history', 'Outstanding balance in view'],
    note: 'Kharchi records money already paid. NirmanSite does not transfer that money.',
    len: 8.5,
    screens: [
      { src: mRecordKharchi, alt: 'Record paid Kharchi: date, worker, amount and payment method', at: 0, taps: [{ at: 2.7, x: 0.733, y: 0.93 }] },
      { src: mKharchiAdjust, alt: 'Kharchi detail with an adjustment being added to the balance', at: 3.2, enter: 'sheet', taps: [{ at: 5.2, x: 0.266, y: 0.676 }, { at: 7, x: 0.737, y: 0.928 }] },
    ],
    office: { shot: { side: wKharchiSide, top: wKharchiTop, body: wKharchiBody }, alt: 'Web workspace: Kharchi advances with outstanding balances per worker', focus: '50% 30%' },
  },
  {
    day: 'Saturday',
    time: '18:00',
    title: 'Wages',
    desc: 'Choose the period, generate a preview and confirm the batch after review.',
    points: ['Attendance and rates in the calculation', 'Kharchi adjusted against wages', 'Paid and due, worker by worker'],
    note: 'Review before you confirm.',
    len: 10,
    screens: [
      { src: mWages, alt: 'Wages: choose a wage period and generate a preview', at: 0, taps: [{ at: 2.4, x: 0.5, y: 0.548 }] },
      { src: mWagesBatch, alt: 'Batch details: net wage, paid and due, with each worker’s wage', at: 2.9, scroll: [{ at: 4.8, to: 0.42, dur: 3 }] },
    ],
    office: { shot: { side: wWagesSide, top: wWagesTop, body: wWagesBody }, alt: 'Web workspace: wage batches with worker payments', focus: '62% 40%' },
  },
]
const STARTS = MOMENTS.reduce<number[]>((a, m, i) => [...a, i ? a[i - 1] + MOMENTS[i - 1].len : 0], [])
const TOTAL = STARTS[STARTS.length - 1] + MOMENTS[MOMENTS.length - 1].len

export default function WorkingWeek() {
  const reduced = useReducedMotion()
  const { ref, near, visible } = useViewport<HTMLDivElement>('700px', 0.25)
  const { t, seek } = useLoop(TOTAL, visible && !reduced)
  const active = Math.max(0, STARTS.findLastIndex(s => t >= s))
  const e = t - STARTS[active] // time within the active moment
  const m = MOMENTS[active]
  const local = (i: number) => (i !== active ? 0 : reduced ? MOMENTS[i].len - 0.3 : e)

  return (
    <section aria-labelledby="week-title" className="relative overflow-hidden bg-coffee py-[clamp(84px,10vw,140px)] text-cream">
      <div aria-hidden="true" className="absolute inset-0 bg-[linear-gradient(rgb(247_245_239/0.045)_1px,transparent_1px),linear-gradient(90deg,rgb(247_245_239/0.045)_1px,transparent_1px)] bg-[size:72px_72px] [mask-image:radial-gradient(90%_70%_at_50%_0%,#000,transparent_80%)]" />
      <div ref={ref} className="shell relative">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.8fr)] lg:items-end lg:gap-16">
          <div>
            <Eyebrow tone="dark">03 / One working week</Eyebrow>
            <Title id="week-title" className="mt-5 text-cream">
              Labour attendance, Kharchi and wages.
            </Title>
          </div>
          <p className="max-w-[44ch] text-[17px] font-medium leading-relaxed text-cream/70 lg:justify-self-end lg:pb-3">
            Keep worker records, daily attendance and wage settlement connected by project. Record Kharchi already paid to workers and account for those advances when reviewing wages. Workers do not need to install the app.
          </p>
        </div>

        {/* the moments, as tabs that also show how far the replay has got */}
        <div role="tablist" aria-label="Moments in the week" className="mt-12 grid grid-cols-3 gap-2 md:gap-2.5">
          {MOMENTS.map((x, i) => {
            const on = i === active
            return (
              <button
                key={x.title}
                type="button"
                role="tab"
                id={`week-tab-${i}`}
                aria-selected={on}
                aria-controls="week-panel"
                onClick={() => seek(STARTS[i])}
                className={`relative cursor-pointer overflow-hidden rounded-2xl border px-3 pb-3.5 pt-3 text-left transition-colors duration-300 md:px-4 ${
                  on ? 'border-copper-400/50 bg-copper-400/[0.14]' : 'border-cream/[0.12] bg-cream/[0.04] hover:bg-cream/[0.08]'
                }`}
              >
                <span className={`block text-[12.5px] font-extrabold tabular-nums transition-colors ${on ? 'text-copper-400' : 'text-cream/50'}`}>
                  {x.day.slice(0, 3)} · {x.time}
                </span>
                <span className="mt-1 block text-[14px] font-bold leading-tight md:text-[15.5px]">{x.title}</span>
                <span
                  aria-hidden="true"
                  className="absolute bottom-0 left-0 h-[3px] w-full origin-left bg-copper-400"
                  style={{ scale: `${on ? (reduced ? 1 : Math.min(1, e / x.len)) : 0} 1`, transition: 'scale 80ms linear' }}
                />
              </button>
            )
          })}
        </div>

        <div id="week-panel" role="tabpanel" aria-labelledby={`week-tab-${active}`} className="mt-10 grid items-center gap-10 lg:mt-14 lg:grid-cols-[minmax(0,0.85fr)_auto_minmax(0,1.25fr)] lg:gap-[clamp(32px,4vw,64px)]">
          {/* what happens in this moment */}
          <div className="order-2 lg:order-1">
            <p key={m.time} className="rise-in font-[family-name:var(--font-display)] text-[clamp(56px,6vw,84px)] leading-none text-copper-400">
              {m.time}
            </p>
            <h3 className="mt-3 text-[clamp(24px,2.2vw,30px)] font-bold tracking-[-0.01em]">
              {m.day} · {m.title}
            </h3>
            <p className="mt-3 max-w-[40ch] text-[16px] font-medium leading-relaxed text-cream/70">{m.desc}</p>
            <ul className="mt-6 flex flex-col gap-2.5">
              {m.points.map(p => (
                <li key={p} className="flex items-center gap-3 text-[15px] font-semibold">
                  <span className="grid size-6 shrink-0 place-items-center rounded-full bg-olive text-cream">
                    <Icon path={mdiCheck} size={14} />
                  </span>
                  {p}
                </li>
              ))}
            </ul>
            <p className="mt-6 border-l-2 border-copper-400/60 pl-3 text-[13.5px] font-semibold leading-snug text-cream/60">{m.note}</p>
          </div>

          {/* the mobile app, replaying the flow */}
          <div className="order-1 mx-auto w-[min(72vw,300px)] lg:order-2 lg:w-[clamp(250px,21vw,300px)]">
            <PhoneFrame className="drop-shadow-[0_40px_60px_rgb(0_0_0/0.45)]">
              {MOMENTS.map((x, i) => (
                <div key={x.title} className="absolute inset-0 transition-opacity duration-500" style={{ opacity: i === active ? 1 : 0, zIndex: i === active ? 1 : 0 }} aria-hidden={i !== active}>
                  <PhoneFlow screens={x.screens} t={local(i)} ready={near} still={i !== active || reduced} sizes="(min-width: 1024px) 300px, 72vw" />
                </div>
              ))}
            </PhoneFrame>
            <p className="mt-4 text-center text-[12px] font-bold uppercase tracking-[0.14em] text-cream/45">Mobile app · on site</p>
          </div>

          {/* the same records, in the office */}
          <div className="order-3">
            <BrowserFrame label="NirmanSite · Web workspace" className="ring-cream/10">
              {MOMENTS.map((x, i) => {
                const on = i === active
                return (
                  <div key={x.title} className="absolute inset-0 overflow-hidden transition-opacity duration-500" style={{ opacity: on ? 1 : 0 }} aria-hidden={!on}>
                    <div
                      className="absolute inset-0"
                      style={{
                        transformOrigin: x.office.focus,
                        scale: on && !reduced && e > 1 ? '1.12' : '1',
                        transition: on && e > 1 ? 'scale 7s cubic-bezier(0.25, 0.1, 0.25, 1)' : 'none',
                      }}
                    >
                      {near && <WebScreen shot={x.office.shot} alt={x.office.alt} sizes="(min-width: 1024px) 640px, 92vw" />}
                    </div>
                  </div>
                )
              })}
            </BrowserFrame>
            <p className="mt-4 text-[12px] font-bold uppercase tracking-[0.14em] text-cream/45">Web workspace · in the office</p>
          </div>
        </div>
      </div>
    </section>
  )
}
