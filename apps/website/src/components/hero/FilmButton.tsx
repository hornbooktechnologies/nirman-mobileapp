'use client'

import { useRef } from 'react'
import { mdiClose } from '@mdi/js'
import Icon from '@/components/ui/Icon'

/** Any trigger (children) that opens the 30-second NirmanSite film in a modal player. */
export default function FilmTrigger({ children, className = '', label = 'Watch the 30-second NirmanSite film' }: { children: React.ReactNode; className?: string; label?: string }) {
  const dialog = useRef<HTMLDialogElement>(null)
  const video = useRef<HTMLVideoElement>(null)

  const open = () => {
    dialog.current?.showModal()
    video.current?.play().catch(() => {})
  }
  const close = () => {
    video.current?.pause()
    dialog.current?.close()
  }

  return (
    <>
      <button type="button" onClick={open} aria-label={label} className={`cursor-pointer ${className}`}>
        {children}
      </button>
      <dialog
        ref={dialog}
        onClose={() => video.current?.pause()}
        onClick={e => e.target === dialog.current && close()}
        className="m-auto w-[min(92vw,1100px)] overflow-visible rounded-3xl bg-transparent p-0 backdrop:bg-coffee/70 backdrop:backdrop-blur-sm"
        aria-label="NirmanSite film"
      >
        <div className="relative overflow-hidden rounded-3xl bg-black shadow-2xl">
          <video ref={video} src="/media/nirmansite-film.mp4" poster="/media/nirmansite-film-poster.webp" controls playsInline preload="none" className="block aspect-video w-full" />
        </div>
        <button type="button" onClick={close} aria-label="Close film" className="absolute -right-3 -top-3 grid size-11 cursor-pointer place-items-center rounded-full bg-cream text-coffee shadow-lg">
          <Icon path={mdiClose} size={22} />
        </button>
      </dialog>
    </>
  )
}
