import { Layer } from '@/components/hero/Hero'
import { Eyebrow, Title } from './kit'
import dFar from '@/assets/scene/desktop-far.webp'
import dGrass from '@/assets/scene/desktop-grass.webp'
import mFar from '@/assets/scene/mobile-far.webp'
import mGrass from '@/assets/scene/mobile-grass.webp'

/** a quiet pause back on site: the hero's landscape (already cached) under one sentence */
export default function Personal() {
  return (
    <section aria-labelledby="personal-title" className="relative isolate overflow-hidden bg-[#e6e3de]">
      <div aria-hidden="true" className="absolute inset-0 bg-[linear-gradient(180deg,#d2dce5_0%,#e3e3df_45%,#ede2d2_75%,#eddcc6_100%)]" />
      <div aria-hidden="true" className="absolute inset-x-0 bottom-0 aspect-[62/100] w-full land:aspect-[2.2/1]">
        <div className="absolute inset-0 opacity-70">
          <Layer d={dFar} m={mFar} />
        </div>
        <Layer d={dGrass} m={mGrass} />
        <div className="absolute inset-x-0 bottom-0 h-1/2 bg-[linear-gradient(to_top,rgb(31_24_17/0.55),rgb(31_24_17/0))]" />
      </div>
      <div className="shell relative flex min-h-[max(78svh,620px)] flex-col items-center pb-[28vh] pt-[clamp(96px,13vw,170px)] text-center land:pb-[34vh]">
        <Eyebrow>Built around real working days</Eyebrow>
        <Title id="personal-title" className="mt-6 text-coffee">
          Construction is personal.
          <br />
          <span className="text-ink/55">Your software should understand it.</span>
        </Title>
        <p className="mt-7 max-w-[52ch] text-[17px] font-medium leading-relaxed text-ink/75">
          NirmanSite grew from conversations with builders and contractors who organise their work in different ways. That is why flexibility sits at the heart of the app.
        </p>
      </div>
    </section>
  )
}
