import { Eyebrow, Title } from './kit'

// answers stay within what the product does today (see the claims checklist in the brief)
const FAQS = [
  {
    q: 'Who is NirmanSite for?',
    a: 'NirmanSite is a construction management app for Indian builders and contractors, and the supervisors, project managers, office staff and sales teams who work with them. It supports both hands-on site management and teams sharing responsibilities across projects.',
  },
  { q: 'What can I manage with NirmanSite?', a: 'You can organise worker records, labour attendance, Kharchi advances, wages, site expenses, material requests, construction progress and sales activity by project. It brings daily site records into a connected mobile and web workspace.' },
  { q: 'Can my site team and office use it together?', a: 'Yes. Site teams can record daily work in the mobile app, while owners and office staff review project records in the web workspace. Access depends on each user’s role and assigned projects.' },
  { q: 'Do workers need to install the app?', a: 'No. You or your site team manage worker records and attendance. Workers do not need app accounts.' },
  { q: 'How are attendance and wages connected?', a: 'Worker records include daily rates and project assignments. Site teams record attendance exceptions such as absences and half-days, then review wages for a period with the attendance and Kharchi records behind them.' },
  {
    q: 'Does recording Kharchi send a payment?',
    a: 'No. Kharchi records money already paid to a worker, so it stays in view and can be adjusted against wages later. NirmanSite does not transfer money.',
  },
  { q: 'Which languages can my team use?', a: 'The mobile app can be used in English, Hindi and Gujarati.' },
  { q: 'Can I manage more than one project?', a: 'Yes. Records are organised by project, and you can switch between projects in the app.' },
  { q: 'Who sees what?', a: 'What each person can see and do follows their role and project, for example as an owner, a supervisor or in sales.' },
  { q: 'How can I request a demo?', a: 'Use the Contact us page to tell us about your construction business and the workflows you want to simplify. The Hornbook Technologies team will contact you to discuss your requirements and a product demonstration.' },
]

export default function Faq() {
  return (
    <section id="faq" aria-labelledby="faq-title" className="scroll-mt-20 bg-cream py-[clamp(84px,10vw,140px)]">
      <div className="shell grid gap-12 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] lg:gap-[clamp(48px,6vw,110px)]">
        <div>
          <Eyebrow>A few things worth knowing</Eyebrow>
          <Title id="faq-title" className="mt-5 text-coffee">
            Questions about NirmanSite.
          </Title>
        </div>
        <div className="border-t border-coffee/[0.12]">
          {FAQS.map((f, i) => (
            <details key={f.q} name="faq" open={i === 0} className="group border-b border-coffee/[0.12]">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-6 py-6 text-[clamp(18px,1.6vw,21px)] font-bold tracking-[-0.01em] text-coffee marker:hidden [&::-webkit-details-marker]:hidden">
                {f.q}
                <span aria-hidden="true" className="grid size-9 shrink-0 place-items-center rounded-full border border-coffee/[0.18] text-[20px] font-medium transition-transform duration-300 group-open:rotate-45">
                  +
                </span>
              </summary>
              <p className="max-w-[62ch] pb-7 text-[16px] font-medium leading-relaxed text-ink/75 group-open:motion-safe:animate-[rise-in_0.35s_ease-out]">{f.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  )
}
