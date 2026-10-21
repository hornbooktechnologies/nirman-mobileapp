import { publicPageMetadata } from '@/config/seo'
import Image from 'next/image'
import { mdiCheck } from '@mdi/js'
import PhoneFrame from '@/components/devices/Phone'
import Icon from '@/components/ui/Icon'
import { Eyebrow, Title } from '@/components/sections/kit'
import { Arrow } from '@/components/site/Header'
import { BODY, Blueprint, CompanyCta, LEAD, PAGE_TOP } from '@/components/company/parts'
import dashboard from '@/assets/screens/mobile/dashboard.webp'
import siteVisit from '@/assets/company/site-visit.webp'
import logo from '@/assets/brand/horizontal-logo.png'

export const metadata = publicPageMetadata('/about', 'About Hornbook Technologies', 'Meet Hornbook Technologies, the software development, consulting and product design team behind NirmanSite, a construction management app for Indian builders and contractors.')

const DISCIPLINES = ['Consulting', 'Engineering', 'Product design']

export default function AboutPage() {
  return (
    <>
      {/* who we are */}
      <section aria-labelledby="about-title" className={`bg-cream pb-[clamp(84px,10vw,140px)] ${PAGE_TOP}`}>
        <div className="shell grid gap-14 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)] lg:items-center lg:gap-[clamp(48px,6vw,110px)]">
          <div>
            <Eyebrow>About us / The team behind NirmanSite</Eyebrow>
            <h1
              id="about-title"
              className="rise-in mt-6 font-[family-name:var(--font-display)] text-[clamp(52px,7.2vw,108px)] font-normal leading-[0.92] tracking-[-0.015em] text-coffee"
            >
              We are
              <br />
              <em className="text-copper">Hornbook Technologies.</em>
            </h1>
            <p className={`mt-8 max-w-[36ch] ${LEAD}`}>A software development and consulting company turning business needs into practical digital solutions.</p>
            <p className={`mt-4 max-w-[54ch] ${BODY}`}>
              We bring together engineers, consultants and product designers to build custom software, web and mobile applications, and SaaS products. Our work connects how businesses operate with technology that makes
              their everyday processes easier to manage.
            </p>
            <div className="mt-9 border-t border-coffee/[0.1] pt-8">
              <p className={`max-w-[36ch] ${LEAD}`}>NirmanSite is our construction-management product.</p>
              <p className={`mt-4 max-w-[54ch] ${BODY}`}>We’re bringing that expertise to builders, contractors and site teams—connecting people, records and project activity in one approachable app.</p>
            </div>
            <a
              href="https://www.hornbooktechnologies.com/"
              className="group mt-8 inline-flex items-center gap-1.5 border-b-2 border-copper/40 pb-1 text-[16px] font-bold text-coffee transition-colors hover:border-copper hover:text-copper-700"
            >
              Explore Hornbook Technologies
              <Arrow className="transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
            </a>
          </div>

          {/* the product, on a site-plan sheet */}
          <figure className="relative">
            <Blueprint className="@container aspect-[600/660] max-lg:mx-auto max-lg:max-w-[560px]">
              <div className="absolute left-1/2 top-[11%] w-[44%] -translate-x-1/2">
                <PhoneFrame>
                  <Image src={dashboard} alt="NirmanSite dashboard screen: Your site. In your pocket." fill quality={90} sizes="(min-width: 1024px) 300px, 44vw" className="object-cover object-top" />
                </PhoneFrame>
              </div>
              {/* the stamp from the original page */}
              <span className="absolute bottom-[21%] left-[6%] -rotate-[8deg] rounded-md border-2 border-cream/70 bg-olive-700 px-[2.4cqw] py-[1.4cqw] text-[clamp(10px,2.1cqw,13px)] font-extrabold uppercase leading-snug tracking-[0.08em] text-cream shadow-[0_18px_30px_-16px_rgb(42_33_27/0.6)]">
                Built by Hornbook.
                <br />
                Built for your site.
              </span>
              <div className="absolute right-[4%] top-[52%] flex w-[40%] items-start gap-[2.2cqw] rounded-2xl bg-white/95 p-[2.6cqw] shadow-[0_24px_50px_-24px_rgb(42_33_27/0.5)] ring-1 ring-coffee/[0.06] backdrop-blur">
                <span className="grid size-[max(28px,6.4cqw)] shrink-0 place-items-center rounded-lg bg-olive text-white">
                  <Icon path={mdiCheck} size={18} />
                </span>
                <span className="leading-tight">
                  <span className="block text-[clamp(9.5px,1.9cqw,11.5px)] font-extrabold uppercase tracking-[0.12em] text-muted">Project visibility</span>
                  <strong className="mt-1 block text-[clamp(13px,2.6cqw,16px)] font-bold text-coffee">One place to start your day.</strong>
                </span>
              </div>
            </Blueprint>
            <figcaption className="mt-4 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 px-1 max-lg:mx-auto max-lg:max-w-[560px]">
              <span className="font-[family-name:var(--font-display)] text-[24px] leading-none text-coffee">Your site. In your pocket.</span>
              <span className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-[#8a775f]">Actual app view · Presentation crop</span>
            </figcaption>
          </figure>
        </div>
      </section>

      {/* why we build this */}
      <section aria-labelledby="expertise-title" className="bg-paper py-[clamp(84px,10vw,140px)]">
        <div className="shell grid gap-14 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] lg:items-center lg:gap-[clamp(48px,6vw,110px)]">
          <div>
            <Eyebrow>Why we build this</Eyebrow>
            {/* three statements: set a size smaller than the section-title default so each stays on one line */}
            <h2
              id="expertise-title"
              className="mt-5 text-balance font-[family-name:var(--font-display)] text-[clamp(40px,4.3vw,66px)] font-normal leading-[0.98] tracking-[-0.012em] text-coffee"
            >
              Business understanding.
              <br />
              Product thinking.
              <br />
              <span className="text-ink/55">Engineering behind both.</span>
            </h2>
            <p className={`mt-7 max-w-[52ch] ${BODY}`}>
              Consulting helps us understand the workflow. Product design makes it approachable. Engineering brings the connected system to life. Together, these capabilities give us a practical foundation for building
              NirmanSite.
            </p>
            <p className={`mt-4 max-w-[52ch] ${BODY}`}>
              Our aim is software that feels shaped around construction work: familiar terms, clear records and useful connections between attendance, Kharchi, wages, expenses, materials and progress.
            </p>
          </div>

          {/* three disciplines feeding one product (mirrors the landing page's ways-of-working diagram) */}
          <Blueprint className="px-[clamp(10px,3vw,40px)] pb-[clamp(32px,5vw,64px)] pt-[clamp(64px,8vw,96px)]">
            {/* three columns; the connector below starts at each column's centre (1/6, 3/6, 5/6 of the width) */}
            <div className="grid grid-cols-3 gap-2">
              {DISCIPLINES.map(d => (
                <span
                  key={d}
                  className="flex min-h-11 items-center justify-center gap-2 justify-self-center rounded-[14px] border border-coffee/[0.12] bg-white px-2.5 py-1.5 text-center text-[12px] font-bold leading-tight text-coffee shadow-[0_16px_30px_-18px_rgb(42_33_27/0.55)] sm:min-h-12 sm:whitespace-nowrap sm:px-4 sm:text-[15px]"
                >
                  <span className="size-[7px] shrink-0 rounded-full bg-olive max-sm:hidden" />
                  {d}
                </span>
              ))}
            </div>
            <svg viewBox="0 0 600 120" preserveAspectRatio="none" className="block h-[clamp(64px,10vw,120px)] w-full" aria-hidden="true">
              <path
                d="M100 0 C100 70 300 50 300 120 M300 0 V120 M500 0 C500 70 300 50 300 120"
                fill="none"
                stroke="rgb(42 33 27 / 0.3)"
                strokeWidth="2"
                strokeDasharray="5 6"
                vectorEffect="non-scaling-stroke"
              />
            </svg>
            <span aria-hidden="true" className="mx-auto -mt-1.5 block size-3 rounded-full bg-copper ring-[6px] ring-copper/20" />
            <div className="mx-auto mt-5 flex w-[min(100%,360px)] flex-col items-center rounded-[22px] bg-white px-6 pb-6 pt-7 text-center shadow-[0_30px_60px_-30px_rgb(42_33_27/0.55)] ring-1 ring-coffee/[0.08]">
              <Image src={logo} alt="NirmanSite" height={40} sizes="220px" className="h-[34px] w-auto sm:h-[40px]" />
              <p className="mt-3 font-[family-name:var(--font-display)] text-[clamp(20px,2vw,25px)] leading-tight text-ink">Our expertise. Your everyday work.</p>
            </div>
          </Blueprint>
        </div>
      </section>

      {/* how NirmanSite took shape */}
      <section aria-labelledby="shape-title" className="bg-cream py-[clamp(84px,10vw,140px)]">
        <div className="shell grid gap-12 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:items-center lg:gap-[clamp(48px,6vw,110px)]">
          <div className="relative aspect-[4/5] overflow-hidden rounded-[32px] shadow-[0_40px_80px_-40px_rgb(42_33_27/0.55)] lg:aspect-[5/6]">
            <Image
              src={siteVisit}
              alt="Construction-site illustration accompanying the NirmanSite product story"
              fill
              sizes="(min-width: 1024px) 42vw, 100vw"
              className="object-cover object-[50%_72%]"
            />
          </div>
          <div>
            <Eyebrow>How NirmanSite took shape</Eyebrow>
            <Title id="shape-title" className="mt-5 text-coffee">
              A little listening.
              <br />
              <em className="text-copper">A clearer direction.</em>
            </Title>
            <p className={`mt-7 max-w-[54ch] ${BODY}`}>
              Our engineers and product designers spoke with builders and contractors to understand their hurdles, routines and repeated follow-ups. Those conversations helped shape NirmanSite around the way construction
              teams already work.
            </p>
            <p className={`mt-4 max-w-[54ch] ${BODY}`}>That is the idea behind the product: bring scattered records together and make digital tools feel familiar—not like another process to learn.</p>
          </div>
        </div>
      </section>

      <CompanyCta />
    </>
  )
}
