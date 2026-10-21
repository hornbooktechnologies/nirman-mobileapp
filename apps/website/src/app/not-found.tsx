import Header from '@/components/site/Header'
import Footer from '@/components/site/Footer'
import { Layer } from '@/components/hero/Hero'
import { Eyebrow, Title } from '@/components/sections/kit'
import { PillLink } from '@/components/company/parts'
import dFar from '@/assets/scene/desktop-far.webp'
import dGrass from '@/assets/scene/desktop-grass.webp'
import mFar from '@/assets/scene/mobile-far.webp'
import mGrass from '@/assets/scene/mobile-grass.webp'

/** 404: rendered outside the (site) group, so it brings its own header and footer */
export default function NotFound() {
  return (
    <>
      <Header />
      <main id="main-content">
        <section aria-labelledby="not-found-title" className="relative isolate overflow-hidden bg-[#e6e3de]">
          <div aria-hidden="true" className="absolute inset-0 bg-[linear-gradient(180deg,#d2dce5_0%,#e3e3df_45%,#ede2d2_75%,#eddcc6_100%)]" />
          <div aria-hidden="true" className="absolute inset-x-0 bottom-0 aspect-[62/100] w-full land:aspect-[2.2/1]">
            <div className="absolute inset-0 opacity-70">
              <Layer d={dFar} m={mFar} />
            </div>
            <Layer d={dGrass} m={mGrass} />
            <div className="absolute inset-x-0 bottom-0 h-1/2 bg-[linear-gradient(to_top,rgb(31_24_17/0.55),rgb(31_24_17/0))]" />
          </div>
          <div className="shell relative flex min-h-[max(82svh,640px)] flex-col items-center pb-[28vh] pt-[calc(72px+clamp(72px,10vw,140px))] text-center land:pb-[34vh]">
            <Eyebrow>404</Eyebrow>
            <Title as="h1" id="not-found-title" className="mt-6 text-coffee">
              Page not found
            </Title>
            <p className="mt-6 max-w-[46ch] text-[17px] font-medium leading-relaxed text-ink/75">The page you requested does not exist or may have moved.</p>
            <PillLink href="/" className="mt-9">
              Return home
            </PillLink>
          </div>
        </section>
      </main>
      <Footer />
    </>
  )
}
