'use client'

import Image, { type StaticImageData } from 'next/image'
import { useEffect, useState } from 'react'

export type RollScreen = { src: StaticImageData; alt: string; label: string }

const EDGE = 12 // px of extruded frame depth
const SHAPE = 'rounded-[14%/6.4%]'

/**
 * A 3D-tilted phone whose real app screens roll up one after another (a slow, pausable carousel).
 * Pauses on hover / focus and does not auto-rotate for people who prefer reduced motion.
 */
export default function Phone3D({ screens, interval = 3200, className = '', sizes = '200px' }: { screens: RollScreen[]; interval?: number; className?: string; sizes?: string }) {
  const [active, setActive] = useState(0)
  const [prev, setPrev] = useState<number | null>(null)
  const [hold, setHold] = useState(false)
  const [reduced, setReduced] = useState(false)

  useEffect(() => {
    const m = window.matchMedia('(prefers-reduced-motion: reduce)')
    const sync = () => setReduced(m.matches)
    sync()
    m.addEventListener('change', sync)
    return () => m.removeEventListener('change', sync)
  }, [])

  useEffect(() => {
    if (hold || reduced) return
    const id = window.setTimeout(() => {
      setPrev(active)
      setActive((active + 1) % screens.length)
    }, interval)
    return () => window.clearTimeout(id)
  }, [active, hold, reduced, interval, screens.length])

  return (
    <div
      className={`[perspective:1400px] ${className}`}
      role="region"
      aria-roledescription="carousel"
      aria-label="NirmanSite app screens"
      onPointerEnter={() => setHold(true)}
      onPointerLeave={() => setHold(false)}
      onFocus={() => setHold(true)}
      onBlur={() => setHold(false)}
    >
      <div className="motion-safe:animate-[float_6.5s_ease-in-out_infinite]">
        <div className="relative [transform-style:preserve-3d] [transform:rotateX(9deg)_rotateY(-24deg)_rotateZ(5deg)]">
          {Array.from({ length: EDGE }).map((_, i) => (
            <span
              key={i}
              aria-hidden="true"
              className={`absolute inset-0 ${SHAPE}`}
              style={{ transform: `translateZ(${-(i + 1)}px)`, background: i < 2 ? '#6a6158' : i < 4 ? '#3a332d' : '#1c1713' }}
            />
          ))}
          <div className={`relative ${SHAPE} bg-[linear-gradient(150deg,#4b433c_0%,#1b1612_42%,#2e2722_100%)] p-[3%] shadow-[-30px_40px_60px_-20px_rgb(20_14_9/0.55)] ring-1 ring-white/10`}>
            <div className="relative aspect-[9/20] overflow-hidden rounded-[11.5%/5.2%] bg-[#0b0908]">
              {screens.map((s, i) => {
                const on = i === active
                const back = i === prev
                return (
                  <div
                    key={s.label}
                    role="group"
                    aria-roledescription="slide"
                    aria-label={`${s.label}, ${i + 1} of ${screens.length}`}
                    aria-hidden={!on}
                    className="absolute inset-0 overflow-hidden"
                    style={{
                      transform: on ? 'translateY(0)' : back ? 'translateY(-12%) scale(0.94)' : 'translateY(101%)',
                      transition: on || back ? 'transform 900ms cubic-bezier(0.65, 0, 0.25, 1)' : 'none',
                      zIndex: on ? 3 : back ? 2 : 1,
                    }}
                  >
                    <Image src={s.src} alt={s.alt} sizes={sizes} quality={90} loading="eager" fetchPriority={i === 0 ? 'high' : 'low'} className="block h-auto w-full" draggable={false} />
                    <span className="absolute inset-0 bg-black transition-opacity duration-[900ms]" style={{ opacity: back ? 0.45 : 0 }} />
                  </div>
                )
              })}
              <span className="absolute left-1/2 top-[1.3%] z-10 size-[4%] -translate-x-1/2 rounded-full bg-[#0b0908]" aria-hidden="true" />
              <span className="pointer-events-none absolute inset-0 z-10 bg-[linear-gradient(118deg,rgb(255_255_255/0.2)_0%,rgb(255_255_255/0)_30%)]" aria-hidden="true" />
            </div>
          </div>
        </div>
      </div>
      <p className="sr-only" aria-live={hold ? 'polite' : 'off'}>
        {screens[active].label}
      </p>
    </div>
  )
}
