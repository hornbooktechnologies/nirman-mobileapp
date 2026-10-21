'use client'

import Image, { type StaticImageData } from 'next/image'
import { useEffect, useRef } from 'react'

export type FlowScreen = {
  src: StaticImageData
  alt: string
  /** seconds into the flow when this screen becomes the active one */
  at: number
  /** how it arrives: pushed in from the right, raised like a bottom sheet, or faded */
  enter?: 'push' | 'sheet' | 'fade'
  /** scroll a tall full-page capture: `to` is 0 (top) … 1 (bottom) of what can scroll */
  scroll?: { at: number; to: number; dur?: number }[]
  /** where a finger taps, as fractions of the phone screen */
  taps?: { at: number; x: number; y: number }[]
}

const EASE = 'cubic-bezier(0.32, 0.72, 0, 1)' // iOS-like navigation curve
const BAR = 90 / 2400 // status bar height as a share of the 1080×2400 screen

/**
 * The real app screens of one flow, stacked inside a phone viewport and driven by a timeline `t` (seconds).
 * Render inside <PhoneFrame>. Until `ready`, only the first screen is mounted (keeps images off the initial load).
 */
export default function PhoneFlow({ screens, t, ready = true, sizes = '320px', still = false }: { screens: FlowScreen[]; t: number; ready?: boolean; sizes?: string; still?: boolean }) {
  // when the loop wraps back to the start, jump there instead of animating backwards
  const prev = useRef(t)
  const wrapped = t < prev.current - 0.25
  useEffect(() => {
    prev.current = t
  })
  const active = Math.max(0, screens.findLastIndex(s => t >= s.at))
  const snap = wrapped || still

  return (
    <>
      {screens.map((s, i) => {
        if (!ready && i > 0) return null
        const next = screens[i + 1]
        const state = i === active ? 'on' : i < active ? 'under' : 'waiting'
        const enter = s.enter ?? 'push'
        let transform = 'none'
        let opacity = 1
        if (state === 'waiting') {
          if (enter === 'push') transform = 'translateX(100%)'
          else if (enter === 'sheet') ((transform = 'translateY(5%)'), (opacity = 0))
          else opacity = 0
        } else if (state === 'under') {
          if (i < active - 1) opacity = 0 // only the screen right behind stays painted
          else if ((next?.enter ?? 'push') === 'push') transform = 'translateX(-26%)'
        }
        const scroll = (s.scroll ?? []).findLast(k => t >= k.at)
        const shift = scroll ? -scroll.to * (1 - (s.src.width * (20 / 9)) / s.src.height) * 100 : 0
        const taps = state === 'on' && !still ? (s.taps ?? []).filter(k => t >= k.at - 0.75 && t < k.at + 0.5) : []
        return (
          <div
            key={s.alt}
            aria-hidden={state !== 'on'}
            className="absolute inset-0 overflow-hidden bg-paper"
            style={{
              transform,
              opacity,
              zIndex: i,
              transition: snap ? 'none' : `transform 620ms ${EASE}, opacity 380ms ease`,
            }}
          >
            <Image
              src={s.src}
              alt={s.alt}
              sizes={sizes}
              quality={90}
              loading="eager"
              className="block h-auto w-full"
              style={{ transform: `translateY(${shift}%)`, transition: snap ? 'none' : `transform ${scroll?.dur ?? 2.2}s cubic-bezier(0.45, 0, 0.2, 1)` }}
              draggable={false}
            />
            {/* the status bar stays put while a long screen scrolls */}
            {s.scroll && (
              <div className="absolute inset-x-0 top-0 overflow-hidden" style={{ height: `${BAR * 100}%` }} aria-hidden="true">
                <Image src={s.src} alt="" sizes={sizes} quality={90} loading="eager" className="block h-auto w-full" draggable={false} />
              </div>
            )}
            {/* when the next screen is pushed over this one, it dims slightly */}
            <span className="pointer-events-none absolute inset-0 bg-black" style={{ opacity: state === 'under' && (next?.enter ?? 'push') === 'push' ? 0.18 : 0, transition: snap ? 'none' : 'opacity 500ms ease' }} />
            {taps.map(k => {
              const pressed = t >= k.at
              return (
                <span key={k.at} className="pointer-events-none absolute animate-[tap-in_220ms_ease-out]" style={{ left: `${k.x * 100}%`, top: `${k.y * 100}%` }}>
                  <span
                    className="absolute left-0 top-0 block aspect-square w-[34px] -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white/90 bg-white/35 shadow-[0_4px_14px_rgb(0_0_0/0.35)] backdrop-blur-[1px]"
                    style={{ scale: pressed ? '0.78' : '1', transition: 'scale 140ms ease-out' }}
                  />
                  <span
                    className="absolute left-0 top-0 block aspect-square w-[34px] -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white"
                    style={{ scale: pressed ? '2.4' : '1', opacity: pressed ? 0 : 0.8, transition: pressed ? 'scale 520ms ease-out, opacity 520ms ease-out' : 'none' }}
                  />
                </span>
              )
            })}
          </div>
        )
      })}
    </>
  )
}
