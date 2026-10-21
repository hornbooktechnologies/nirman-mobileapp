import Link from 'next/link'
import { Eyebrow, Title } from '@/components/sections/kit'
import { Blueprint, LEAD, PAGE_TOP } from './parts'

export type LegalSection = { id: string; title: string; text: string }

/** "Your information. A clearer picture." → first sentence, then the rest on its own quieter line */
function splitTitle(title: string) {
  const i = title.indexOf('. ')
  return i === -1 ? [title, ''] : [title.slice(0, i + 1), title.slice(i + 2)]
}

export function LegalPage({
  kind,
  title,
  intro,
  cards,
  sections,
}: {
  kind: string
  title: string
  intro: string
  cards: { title: string; text: string }[]
  sections: LegalSection[]
}) {
  const [first, rest] = splitTitle(title)
  return (
    <div className={`bg-cream pb-[clamp(84px,10vw,140px)] ${PAGE_TOP}`}>
      <div className="shell">
        <header className="max-w-[980px]">
          <Eyebrow>NirmanSite / {kind}</Eyebrow>
          <Title as="h1" className="mt-6 text-coffee">
            {first}
            {rest && (
              <>
                <br />
                <span className="text-ink/55">{rest}</span>
              </>
            )}
          </Title>
          <p className={`mt-7 max-w-[56ch] ${LEAD}`}>{intro}</p>
        </header>

        <Blueprint className="mt-[clamp(40px,5vw,64px)] px-[clamp(18px,3vw,40px)] pb-7 pt-14">
          <Eyebrow>The short version</Eyebrow>
          <div className="mt-5 grid gap-3 md:grid-cols-3">
            {cards.map((card, i) => (
              <article key={card.title} className="rounded-[20px] border border-coffee/[0.08] bg-white p-6 shadow-[0_24px_50px_-34px_rgb(42_33_27/0.45)]">
                <span aria-hidden="true" className="grid size-9 place-items-center rounded-full bg-olive-100 text-[13px] font-extrabold tabular-nums text-olive-700">
                  0{i + 1}
                </span>
                <h2 className="mt-5 text-[20px] font-bold tracking-[-0.01em] text-coffee">{card.title}</h2>
                <p className="mt-2 text-[15px] font-medium leading-relaxed text-ink/70">{card.text}</p>
              </article>
            ))}
          </div>
          <p className="mt-5 text-[13px] font-bold text-muted">A guide to the full document below, not a replacement for it.</p>
        </Blueprint>

        <p role="note" className="mt-6 rounded-xl border-l-[3px] border-copper bg-copper-100/70 px-5 py-4 text-[14px] font-semibold leading-relaxed text-ink/80">
          Draft for review · These pages are not final legal notices. Legal review and confirmation of service and data-handling details are required before launch.
        </p>

        <div className="mt-[clamp(48px,6vw,88px)] grid gap-12 lg:grid-cols-[minmax(220px,280px)_minmax(0,1fr)] lg:gap-[clamp(48px,6vw,110px)]">
          <aside>
            <nav aria-label="On this page" className="lg:sticky lg:top-[104px]">
              <Eyebrow>On this page</Eyebrow>
              <ol className="mt-4 border-t border-coffee/[0.1]">
                {sections.map((s, i) => (
                  <li key={s.id}>
                    <a
                      href={`#${s.id}`}
                      className="flex gap-3 border-b border-coffee/[0.08] py-2.5 text-[14.5px] font-semibold leading-snug text-ink/75 transition-colors hover:text-copper-700"
                    >
                      <span className="w-6 shrink-0 font-extrabold tabular-nums text-copper-700">{String(i + 1).padStart(2, '0')}</span>
                      {s.title}
                    </a>
                  </li>
                ))}
              </ol>
            </nav>
          </aside>

          <div className="max-w-[72ch]">
            {sections.map((s, i) => (
              <section key={s.id} id={s.id} aria-labelledby={`${s.id}-title`} className="scroll-mt-[100px] border-b border-coffee/[0.1] py-9 first:pt-0">
                <span className="text-[12px] font-extrabold uppercase tracking-[0.2em] text-copper-700">Section {String(i + 1).padStart(2, '0')}</span>
                <h2 id={`${s.id}-title`} className="mt-3 font-[family-name:var(--font-display)] text-[clamp(30px,2.8vw,40px)] font-normal leading-[1.02] text-coffee">
                  {s.title}
                </h2>
                <p className="mt-4 text-[17px] font-medium leading-relaxed text-ink/75">{s.text}</p>
              </section>
            ))}
            <p className="mt-9 text-[16px] font-medium text-ink/75">
              Questions?{' '}
              <a href="mailto:contact@hornbooktechnologies.com" className="font-bold text-copper-700 underline decoration-copper/40 underline-offset-2 hover:decoration-copper">
                contact@hornbooktechnologies.com
              </a>
            </p>
            <Link href="/contact" className="mt-4 inline-flex items-center gap-2 text-[16px] font-bold text-coffee transition-colors hover:text-copper-700">
              Contact the NirmanSite team →
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
