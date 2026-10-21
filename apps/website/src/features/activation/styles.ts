/**
 * Class names for the activation screens, in the new site's look.
 * Same keys as the previous activation.module.css, so the components only swapped their import.
 */
export const styles = {
  page: 'relative isolate grid min-h-dvh place-items-center overflow-hidden bg-cream px-4 py-10',
  backdrop:
    'pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(rgb(42_33_27/0.1)_1px,transparent_1px)] bg-[size:22px_22px] [mask-image:radial-gradient(ellipse_at_center,black_20%,transparent_75%)]',
  card: 'w-full max-w-[480px] rounded-[28px] border border-coffee/[0.08] bg-white p-[clamp(24px,5vw,40px)] text-coffee shadow-[0_40px_80px_-40px_rgb(42_33_27/0.45)]',
  brand: 'mb-8 inline-block',
  stack: [
    'grid min-w-0 gap-5',
    '[&_h1]:m-0 [&_h1]:font-[family-name:var(--font-display)] [&_h1]:text-[clamp(34px,7vw,42px)] [&_h1]:font-normal [&_h1]:leading-[1.02] [&_h1]:tracking-[-0.01em] [&_h1]:text-coffee',
    '[&_p]:m-0 [&_p]:text-[15.5px] [&_p]:font-medium [&_p]:leading-relaxed [&_p]:text-ink/80 [&_strong]:font-bold [&_strong]:text-coffee',
    '[&_fieldset]:m-0 [&_fieldset]:min-w-0 [&_fieldset]:border-0 [&_fieldset]:p-0',
    '[&_label]:grid [&_label]:gap-2 [&_label]:text-[14px] [&_label]:font-bold [&_label]:text-coffee',
    '[&_input]:min-h-[52px] [&_input]:w-full [&_input]:rounded-xl [&_input]:border [&_input]:border-coffee/[0.14] [&_input]:bg-paper [&_input]:px-4 [&_input]:text-[16px] [&_input]:font-medium [&_input]:text-coffee [&_input]:transition-[border-color,background-color,box-shadow] [&_input:focus]:border-copper [&_input:focus]:bg-white [&_input:focus]:shadow-[0_0_0_4px_rgb(193_108_49/0.14)] [&_input:focus]:outline-none',
    '[&_[role=alert]]:rounded-xl [&_[role=alert]]:bg-copper-100 [&_[role=alert]]:px-4 [&_[role=alert]]:py-3 [&_[role=alert]]:text-[14.5px] [&_[role=alert]]:font-semibold [&_[role=alert]]:text-[#7a3f16]',
  ].join(' '),
  email: 'rounded-xl bg-cream px-4 py-3.5 text-[14px]! [overflow-wrap:anywhere]',
  primary:
    'flex min-h-[52px] cursor-pointer items-center justify-center rounded-full bg-copper-600 px-6 text-center text-[15.5px] font-bold text-white transition-colors duration-200 hover:bg-[#96501e] disabled:cursor-wait disabled:opacity-65',
  secondary:
    'flex min-h-[52px] items-center justify-center rounded-full border border-coffee/[0.16] bg-white px-6 text-center text-[15px] font-bold text-coffee transition-colors duration-200 hover:border-coffee/40 hover:bg-paper',
  hint: 'text-[14px]! text-muted!',
} as const
