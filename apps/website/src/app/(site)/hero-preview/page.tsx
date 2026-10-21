export const metadata = { title: 'Hero background preview | NirmanSite', robots: { index: false, follow: false } }

import Hero from '@/components/hero/PhotoHero'
import Scattered from '@/components/sections/Scattered'
import WorkModels from '@/components/sections/WorkModels'
import WorkingWeek from '@/components/sections/WorkingWeek'
import SiteMoney from '@/components/sections/SiteMoney'
import MaterialsProgress from '@/components/sections/MaterialsProgress'
import Language from '@/components/sections/Language'
import Sales from '@/components/sections/Sales'
import Personal from '@/components/sections/Personal'
import Faq from '@/components/sections/Faq'
import FinalCta from '@/components/sections/FinalCta'

export default function Home() {
  return (
    <>
      <Hero />
      <Scattered />
      <WorkModels />
      <WorkingWeek />
      <SiteMoney />
      <MaterialsProgress />
      <Language />
      <Sales />
      <Personal />
      <Faq />
      <FinalCta />
    </>
  )
}
