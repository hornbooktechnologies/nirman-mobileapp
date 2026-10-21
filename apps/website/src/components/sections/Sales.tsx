'use client'

import PhoneFrame from '@/components/devices/Phone'
import PhoneFlow, { type FlowScreen } from './PhoneFlow'
import { Eyebrow, Title, useLoop, useReducedMotion, useViewport } from './kit'

import sLeads from '@/assets/screens/mobile/sales-leads.webp'
import sAddLead from '@/assets/screens/mobile/sales-add-lead.webp'
import sLeadDetails from '@/assets/screens/mobile/sales-lead-details.webp'
import sFollowups from '@/assets/screens/mobile/sales-followups.webp'
import sVisits from '@/assets/screens/mobile/sales-site-visits.webp'
import sUnits from '@/assets/screens/mobile/unit-inventory.webp'
import sBookings from '@/assets/screens/mobile/sales-bookings.webp'
import sBooking from '@/assets/screens/mobile/sales-booking-details.webp'

// the real sales screens, from a new enquiry to a confirmed booking
const FLOW: FlowScreen[] = [
  { src: sLeads, alt: 'Sales leads for the project, each with its stage', at: 0, taps: [{ at: 1.6, x: 0.896, y: 0.342 }] },
  { src: sAddLead, alt: 'New lead form: customer, budget, preferred unit and lead source', at: 2.1, enter: 'sheet', scroll: [{ at: 3.4, to: 1, dur: 2.4 }], taps: [{ at: 6.4, x: 0.735, y: 0.925 }] },
  { src: sLeadDetails, alt: 'Lead details with the next actions: change stage, add a note, schedule a follow-up or site visit', at: 6.9, scroll: [{ at: 8.2, to: 0.38, dur: 1.8 }], taps: [{ at: 10.6, x: 0.45, y: 0.6 }] },
  { src: sFollowups, alt: 'Follow-ups: scheduled and completed customer conversations', at: 11.1 },
  { src: sVisits, alt: 'Site visits: upcoming and completed project visits', at: 14.1 },
  { src: sUnits, alt: 'Unit inventory: availability, active blocks and prices', at: 17.1 },
  { src: sBookings, alt: 'Bookings: confirmed and cancelled conversions', at: 20.1, taps: [{ at: 21.8, x: 0.5, y: 0.59 }] },
  { src: sBooking, alt: 'Booking details with the conversion linkage for the lead, salesperson and unit', at: 22.3 },
]
const LOOP = 26
const STAGES: [string, number][] = [
  ['Enquiry', 0],
  ['Follow-up', 11.1],
  ['Site visit', 14.1],
  ['Unit', 17.1],
  ['Booking', 20.1],
]

export default function Sales() {
  const reduced = useReducedMotion()
  const { ref, near, visible } = useViewport<HTMLDivElement>('600px', 0.25)
  const { t: clock, seek } = useLoop(LOOP, visible && !reduced)
  const t = reduced ? LOOP - 1 : clock
  const stage = Math.max(0, STAGES.findLastIndex(([, at]) => t >= at))

  return (
    <section aria-labelledby="sales-title" className="overflow-hidden bg-cream py-[clamp(84px,10vw,140px)]">
      <div ref={ref} className="shell grid items-center gap-14 lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,0.55fr)] lg:gap-[clamp(40px,5vw,88px)]">
        <div>
          <Eyebrow>07 / A little more room for your business</Eyebrow>
          <Title id="sales-title" className="mt-5 text-coffee">
            From the first enquiry to the next site visit.
          </Title>
          <p className="mt-6 max-w-[44ch] text-[17px] font-medium leading-relaxed text-ink/75">
            Manage sales leads for your construction projects. Keep customer enquiries, follow-ups, scheduled site visits, units and booking activity organised alongside daily site work.
          </p>
        </div>

        <div className="mx-auto w-[min(70vw,290px)] lg:w-[clamp(250px,21vw,290px)]">
          <PhoneFrame>
            <PhoneFlow screens={FLOW} t={t} ready={near} still={reduced} sizes="(min-width: 1024px) 290px, 70vw" />
          </PhoneFrame>
        </div>

        {/* where the replay is in the sales journey; each stage jumps there */}
        <ol aria-label="Sales journey" className="relative mx-auto flex w-full max-w-[420px] flex-row justify-between lg:mx-0 lg:max-w-none lg:flex-col lg:gap-1">
          <span aria-hidden="true" className="absolute left-[9px] top-3 hidden w-[2px] bg-coffee/10 lg:bottom-3 lg:block" />
          {STAGES.map(([label, at], i) => {
            const lit = i <= stage, now = i === stage
            return (
              <li key={label}>
                <button
                  type="button"
                  onClick={() => seek(at)}
                  aria-current={now ? 'step' : undefined}
                  className="group relative flex cursor-pointer flex-col items-center gap-2 py-2 text-center lg:flex-row lg:gap-4 lg:text-left"
                >
                  <span
                    className={`relative z-10 size-5 rounded-full border-2 transition-all duration-300 ${lit ? 'border-copper bg-copper' : 'border-coffee/20 bg-cream'} ${now ? 'shadow-[0_0_0_6px_rgb(193_108_49/0.18)]' : ''}`}
                  />
                  <span className={`text-[12px] font-extrabold uppercase tracking-[0.12em] transition-colors duration-300 lg:text-[15px] ${lit ? 'text-coffee' : 'text-coffee/35 group-hover:text-coffee/60'}`}>{label}</span>
                </button>
              </li>
            )
          })}
        </ol>
      </div>
    </section>
  )
}
