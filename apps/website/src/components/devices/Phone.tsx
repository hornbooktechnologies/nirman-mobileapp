/**
 * Android-style phone frame for the real app captures (1080×2400, 9:20).
 * Children are stacked screen layers; only the active one should be visible.
 */
export default function PhoneFrame({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`relative ${className}`}>
      <div className="relative rounded-[14%/6.4%] bg-[#1d1814] p-[3%] shadow-[0_30px_60px_-24px_rgb(42_33_27/0.5),0_12px_24px_-12px_rgb(42_33_27/0.3)] ring-1 ring-black/40">
        <div className="relative aspect-[9/20] overflow-hidden rounded-[11.5%/5.2%] bg-paper">
          {children}
          <span className="absolute left-1/2 top-[1.3%] z-10 size-[4%] -translate-x-1/2 rounded-full bg-[#0b0908]" aria-hidden="true" />
        </div>
      </div>
    </div>
  )
}
