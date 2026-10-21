import Image, { type StaticImageData } from 'next/image'

export type WebShot = { side: StaticImageData; top: StaticImageData; body: StaticImageData }

/** A quiet browser window. Children are stacked screen layers inside a 16:10 viewport. */
export function BrowserFrame({ children, className = '', label = 'NirmanSite · Web workspace' }: { children: React.ReactNode; className?: string; label?: string }) {
  return (
    <div className={`overflow-hidden rounded-[14px] bg-white shadow-[0_40px_80px_-32px_rgb(42_33_27/0.35),0_16px_32px_-20px_rgb(42_33_27/0.2)] ring-1 ring-coffee/10 ${className}`}>
      <div className="flex h-9 items-center gap-1.5 border-b border-coffee/[0.07] bg-[#f4f1eb] px-3.5" aria-hidden="true">
        <span className="size-2.5 rounded-full bg-[#e2dbcf]" />
        <span className="size-2.5 rounded-full bg-[#e2dbcf]" />
        <span className="size-2.5 rounded-full bg-[#e2dbcf]" />
        <span className="mx-auto flex h-6 items-center gap-1.5 rounded-md bg-white px-3 text-[11px] font-semibold text-muted ring-1 ring-coffee/[0.06]">
          <svg viewBox="0 0 16 16" width="11" height="11" aria-hidden="true">
            <path d="M4.5 7V5a3.5 3.5 0 0 1 7 0v2M3.5 7h9v6.5h-9z" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
          </svg>
          {label}
        </span>
        <span className="w-[42px]" />
      </div>
      <div className="relative aspect-[16/10] bg-[#f6f6f6]">{children}</div>
    </div>
  )
}

/**
 * One web-app capture. The captures come from a 1920px-wide viewport with a fixed 310px sidebar
 * and a 60px top bar, which are placed as separate crops so the layout matches the real app.
 */
export function WebScreen({ shot, alt, sizes, priority = false }: { shot: WebShot; alt: string; sizes: string; priority?: boolean }) {
  return (
    <>
      <div className="absolute inset-y-0 left-[16.15%] right-0 overflow-hidden">
        <Image src={shot.body} alt={alt} sizes={sizes} quality={90} priority={priority} className="absolute left-0 top-[5%] block h-auto w-full" draggable={false} />
        <Image src={shot.top} alt="" sizes={sizes} quality={90} priority={priority} className="absolute inset-x-0 top-0 block h-auto w-full" draggable={false} />
      </div>
      <Image src={shot.side} alt="" sizes="(min-width: 1024px) 120px, 16vw" quality={90} priority={priority} className="absolute inset-y-0 left-0 block h-full w-[16.15%]" draggable={false} />
    </>
  )
}
