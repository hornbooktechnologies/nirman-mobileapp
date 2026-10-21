'use client'

import Image from 'next/image'
import PhoneFrame from '@/components/devices/Phone'
import TabletFrame from '@/components/devices/Tablet'
import PhoneFlow, { type FlowScreen } from './PhoneFlow'
import { Eyebrow, Title, span, useLoop, useReducedMotion, useViewport } from './kit'
import tMaterials from '@/assets/screens/tablet/materials.webp'
import mProgress from '@/assets/screens/mobile/project-progress.webp'

const LOOP = 16
// the building diagram is drawn in a 420 × 440 design space
const DW = 420, DH = 440
const pct = (v: number, of: number) => `${(v / of) * 100}%`

const PROGRESS: FlowScreen[] = [
  {
    src: mProgress,
    alt: 'Project progress in the NirmanSite app: overall progress, construction stages and the update history',
    at: 0,
    scroll: [
      { at: 3, to: 1, dur: 2.6 },
      { at: 10.5, to: 0, dur: 2.2 },
    ],
  },
]

/** foundation → plinth → three floors of columns and slabs → brickwork, then it starts again */
function Building({ t }: { t: number }) {
  const f = span(t, 0.3, 3.2), pl = span(t, 3.2, 6), sl = span(t, 6, 10), br = span(t, 10, 13.4)
  const stages: [string, number][] = [['Foundation', f], ['Plinth', pl], ['Slab', sl], ['Brickwork', br]]
  const now = stages.find(([, v]) => v < 1)
  const floors = [0, 1, 2].map(i => ({ top: 328 - (i + 1) * 88, col: span(sl * 3 - i, 0, 1), brick: span(br * 3 - i, 0, 1) }))
  const grow = 'transition-transform duration-300 ease-linear'
  return (
    <div className="relative mx-auto aspect-[420/440] w-full max-w-[420px]" role="img" aria-label="Diagram: a building rising stage by stage, from foundation and plinth to slabs and brickwork">
      {/* current stage */}
      <div className="absolute left-1/2 top-0 flex -translate-x-1/2 items-center gap-2 whitespace-nowrap rounded-full bg-coffee px-3.5 py-2 text-[13px] font-bold text-cream shadow-[0_12px_24px_-12px_rgb(42_33_27/0.6)]">
        <span className={`size-2 rounded-full ${now ? 'bg-copper-400' : 'bg-[#8fce9e]'}`} />
        {now ? `${now[0]} · ${Math.round(now[1] * 100)}%` : 'Structure complete'}
      </div>
      {/* ground */}
      <div className="absolute inset-x-[4%] h-[1.5px] bg-coffee/40" style={{ top: pct(360, DH) }} />
      <div className="absolute inset-x-[4%] bottom-[2%] bg-[repeating-linear-gradient(135deg,rgb(42_33_27/0.07)_0_2px,transparent_2px_10px)]" style={{ top: pct(361.5, DH) }} />
      {/* foundation, dug below the ground line */}
      <div className="absolute border-[1.5px] border-dashed border-coffee/30" style={{ left: pct(50, DW), width: pct(320, DW), top: pct(361.5, DH), height: pct(40, DH) }}>
        <div className={`absolute inset-0 origin-top bg-coffee ${grow}`} style={{ scale: `1 ${f}` }} />
      </div>
      {/* plinth */}
      <div className="absolute border-[1.5px] border-dashed border-coffee/30" style={{ left: pct(70, DW), width: pct(280, DW), top: pct(328, DH), height: pct(32, DH) }}>
        <div className={`absolute inset-0 origin-bottom bg-olive-700 ${grow}`} style={{ scale: `1 ${pl}` }} />
      </div>
      {floors.map((fl, i) => (
        <div key={i} className="absolute border-[1.5px] border-dashed border-coffee/20" style={{ left: pct(70, DW), width: pct(280, DW), top: pct(fl.top, DH), height: pct(88, DH) }}>
          {/* brick infill between the columns */}
          {[0, 1, 2].map(k => (
            <div
              key={k}
              className={`absolute bottom-0 origin-bottom bg-[repeating-linear-gradient(180deg,rgb(193_108_49/0.75)_0_7px,#f7f5ef_7px_9px)] ${grow}`}
              style={{ left: `${4.6 + k * 32}%`, width: '27.5%', height: '84%', scale: `1 ${fl.brick}` }}
            />
          ))}
          {/* columns */}
          {[0, 1, 2, 3].map(k => (
            <div key={k} className={`absolute bottom-0 origin-bottom bg-[#8a7d70] ${grow}`} style={{ left: `calc(${k * 32}% - ${k === 3 ? 1.3 : 0}%)`, width: '4.6%', height: '84%', scale: `1 ${fl.col}` }} />
          ))}
          {/* slab */}
          <div className="absolute -inset-x-[2%] top-0 h-[16%] bg-[#5f554b] transition-opacity duration-300" style={{ opacity: span(fl.col, 0.75, 1) }} />
        </div>
      ))}
    </div>
  )
}

export default function MaterialsProgress() {
  const reduced = useReducedMotion()
  const { ref, near, visible } = useViewport<HTMLDivElement>('600px', 0.25)
  const { t: clock } = useLoop(LOOP, visible && !reduced)
  const t = reduced ? 14 : clock
  const cement = t >= 1.5 && t < 14.5

  return (
    <section aria-labelledby="work-title" className="overflow-hidden bg-cream py-[clamp(84px,10vw,140px)]">
      <div ref={ref} className="shell">
        <div className="mx-auto max-w-[760px] text-center">
          <Eyebrow>05 / The work keeps moving</Eyebrow>
          <Title id="work-title" className="mt-5 text-coffee">
            Material requests and construction progress.
          </Title>
          <p className="mx-auto mt-6 max-w-[48ch] text-[17px] font-medium leading-relaxed text-ink/75">
            Organise construction material requests with quantities, units, required dates and status. Follow project stages and recorded progress updates, keeping the details of each site together.
          </p>
        </div>

        <div className="mt-[clamp(48px,6vw,84px)] grid items-start gap-14 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.1fr)_minmax(0,0.8fr)] lg:gap-[clamp(28px,3.5vw,56px)]">
          {/* materials */}
          <figure className="order-2 lg:order-1">
            <div className="relative mx-auto w-[min(80vw,340px)]">
              <TabletFrame className="-rotate-[1.5deg]">
                <Image src={tMaterials} alt="Materials in the NirmanSite app: total and overdue requests, estimated cost, and each request with its quantity and required date" sizes="(min-width: 1024px) 340px, 80vw" quality={90} className="block h-auto w-full" />
                <span aria-hidden="true" className="absolute left-[2%] right-[2%] top-[54.4%] h-[9.4%] rounded-[1.4%/9%] ring-2 ring-copper transition-opacity duration-500" style={{ opacity: cement ? 1 : 0 }} />
              </TabletFrame>
              <span
                aria-hidden="true"
                className="absolute -right-[7%] top-[62%] rounded-xl bg-coffee px-3 py-2 text-[12.5px] font-bold text-cream shadow-[0_16px_30px_-14px_rgb(42_33_27/0.6)] transition-[opacity,translate] duration-500 max-sm:-right-[2%]"
                style={{ opacity: cement ? 1 : 0, translate: cement ? '0 0' : '0 8px' }}
              >
                Quantity + required date
              </span>
            </div>
            <figcaption className="mx-auto mt-8 max-w-[34ch] text-center lg:text-left">
              <span className="block text-[18px] font-bold text-coffee">Bring order to material requests.</span>
              <span className="mt-2 block text-[15px] font-medium leading-relaxed text-ink/70">Keep quantities, units, required dates and request status together, so the next follow-up has context.</span>
            </figcaption>
          </figure>

          {/* the building in between */}
          <div className="order-1 px-2 lg:order-2 lg:pt-10">
            <Building t={t} />
          </div>

          {/* progress */}
          <figure className="order-3">
            <div className="mx-auto w-[min(62vw,250px)]">
              <PhoneFrame>
                <PhoneFlow screens={PROGRESS} t={t} ready={near} still={reduced} sizes="(min-width: 1024px) 250px, 62vw" />
              </PhoneFrame>
            </div>
            <figcaption className="mx-auto mt-8 max-w-[34ch] text-center lg:text-left">
              <span className="block text-[18px] font-bold text-coffee">Make progress visible.</span>
              <span className="mt-2 block text-[15px] font-medium leading-relaxed text-ink/70">Follow construction stages and the history of recorded updates, without piecing it together from messages.</span>
            </figcaption>
          </figure>
        </div>
      </div>
    </section>
  )
}
