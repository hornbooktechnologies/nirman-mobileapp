/**
 * Portrait tablet frame for the tablet captures (1600×2500, about 16:25).
 * Children are stacked screen layers.
 */
export default function TabletFrame({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`relative ${className}`}>
      <div className="relative rounded-[6.5%/4.2%] bg-[#1d1814] p-[3.2%] shadow-[0_40px_80px_-30px_rgb(42_33_27/0.5),0_14px_28px_-14px_rgb(42_33_27/0.3)] ring-1 ring-black/40">
        <div className="relative aspect-[16/25] overflow-hidden rounded-[3.2%/2.05%] bg-paper">{children}</div>
        <span className="absolute left-1/2 top-[1.5%] size-[1.4%] -translate-x-1/2 rounded-full bg-[#3a332d]" aria-hidden="true" />
      </div>
    </div>
  )
}
