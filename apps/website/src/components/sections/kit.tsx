'use client'

import { useEffect, useRef, useState } from 'react'

/** true while the user prefers reduced motion (kept in sync with the OS setting) */
export function useReducedMotion() {
  const [reduced, setReduced] = useState(false)
  useEffect(() => {
    const m = window.matchMedia('(prefers-reduced-motion: reduce)')
    const sync = () => setReduced(m.matches)
    sync()
    m.addEventListener('change', sync)
    return () => m.removeEventListener('change', sync)
  }, [])
  return reduced
}

/**
 * Watches an element: `near` turns true once it comes within `margin` of the viewport (and stays true),
 * `visible` follows whether enough of it is on screen right now.
 */
export function useViewport<T extends Element>(margin = '600px', threshold = 0.2) {
  const ref = useRef<T>(null)
  const [near, setNear] = useState(false)
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const far = new IntersectionObserver(([e]) => e.isIntersecting && setNear(true), { rootMargin: margin })
    const on = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), { threshold })
    far.observe(el)
    on.observe(el)
    return () => {
      far.disconnect()
      on.disconnect()
    }
  }, [margin, threshold])
  return { ref, near, visible }
}

/**
 * A looping timeline in seconds that only advances while `running` (on screen, tab visible, motion allowed).
 * Ticks ~20 times a second; the CSS transitions on the animated elements fill in between.
 */
export function useLoop(length: number, running: boolean) {
  const [t, setT] = useState(0)
  const now = useRef(0) // current position, kept while paused
  const start = useRef(0) // performance.now() at which the loop was at 0
  useEffect(() => {
    if (!running) return
    let raf = 0, last = 0
    start.current = performance.now() - now.current * 1000
    const tick = (ms: number) => {
      raf = requestAnimationFrame(tick)
      if (ms - last < 50) return
      last = ms
      if (document.hidden) {
        start.current = ms - now.current * 1000 // hold still while the tab is hidden
        return
      }
      // a frame's timestamp can precede the moment the loop (re)started, so keep the position ≥ 0
      now.current = Math.max(0, (ms - start.current) / 1000) % length
      setT(now.current)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [length, running])
  /** jump to a point on the timeline (for tabs / rails the user clicks) */
  const seek = (to: number) => {
    now.current = to
    start.current = performance.now() - to * 1000
    setT(to)
  }
  return { t, seek }
}

export const clamp = (v: number, a = 0, b = 1) => Math.max(a, Math.min(b, v))
/** progress 0→1 of `t` between `a` and `b` */
export const span = (t: number, a: number, b: number) => clamp((t - a) / (b - a))
export const inr = (n: number) => '₹' + Math.round(n).toLocaleString('en-IN')

/** the small numbered label above every section title */
export function Eyebrow({ children, tone = 'light', className = '' }: { children: React.ReactNode; tone?: 'light' | 'dark'; className?: string }) {
  return (
    <p className={`text-[12.5px] font-extrabold uppercase tracking-[0.2em] ${tone === 'dark' ? 'text-copper-400' : 'text-copper-700'} ${className}`}>
      {children}
    </p>
  )
}

/** section titles use the display serif, like the hero headline */
export function Title({ children, as: Tag = 'h2', className = '', id }: { children: React.ReactNode; as?: 'h1' | 'h2' | 'h3'; className?: string; id?: string }) {
  return (
    <Tag id={id} className={`text-balance font-[family-name:var(--font-display)] text-[clamp(40px,5.2vw,76px)] font-normal leading-[0.96] tracking-[-0.012em] ${className}`}>
      {children}
    </Tag>
  )
}
