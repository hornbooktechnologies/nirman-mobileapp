/** Renders a Material Design icon path (from @mdi/js), the icon family used in the NirmanSite app. */
export default function Icon({ path, size = 20, className = '' }: { path: string; size?: number; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true" className={className}>
      <path d={path} fill="currentColor" />
    </svg>
  )
}
