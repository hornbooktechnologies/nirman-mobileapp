import { publicPageMetadata } from '@/config/seo'
import { Eyebrow } from '@/components/sections/kit'
import { Arrow } from '@/components/site/Header'
import { BODY, LEAD, PAGE_TOP } from '@/components/company/parts'
import { ContactForm } from '@/components/company/ContactForm'

export const metadata = publicPageMetadata('/contact', 'Contact us or request a demo', 'Discuss your construction team’s attendance, wage, expense and project management needs with NirmanSite. Contact Hornbook Technologies or request a product demo.')

export default function ContactPage() {
  return (
    <section aria-labelledby="contact-title" className={`bg-cream pb-[clamp(84px,10vw,140px)] ${PAGE_TOP}`}>
      <div className="shell grid gap-12 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:grid-rows-[auto_1fr] lg:gap-x-[clamp(48px,6vw,110px)] lg:gap-y-0">
        <header>
          <Eyebrow>Let’s talk about your site</Eyebrow>
          <h1
            id="contact-title"
            className="rise-in mt-6 font-[family-name:var(--font-display)] text-[clamp(52px,6.6vw,100px)] font-normal leading-[0.92] tracking-[-0.015em] text-coffee"
          >
            Every site works
            <br />
            <em className="text-copper">a little differently.</em>
          </h1>
          <p className={`mt-8 ${LEAD}`}>Tell us about yours. We’ll take it from there.</p>
          <p className={`mt-4 max-w-[50ch] ${BODY}`}>
            Share a few details about your business and what you would like to simplify. Our team will contact you to understand your requirements and discuss how NirmanSite could fit your work.
          </p>
        </header>

        <div className="lg:col-start-2 lg:row-span-2 lg:row-start-1">
          <ContactForm />
        </div>

        <section aria-labelledby="direct-title" className="border-t border-coffee/[0.1] pt-8 lg:mt-12 lg:self-start">
          <Eyebrow>
            <span id="direct-title">Prefer to write to us?</span>
          </Eyebrow>
          <a
            href="mailto:contact@hornbooktechnologies.com"
            className="group mt-4 inline-flex max-w-full items-center gap-2 break-all font-[family-name:var(--font-display)] text-[clamp(26px,2.6vw,36px)] leading-tight text-coffee transition-colors hover:text-copper-700"
          >
            contact@hornbooktechnologies.com
            <Arrow className="shrink-0 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
          </a>
          <p className="mt-6 text-[15px] font-medium leading-relaxed text-muted">
            A product of Hornbook Technologies.
            <br />
            Built in Ahmedabad, for the people building every day.
          </p>
        </section>
      </div>
    </section>
  )
}
