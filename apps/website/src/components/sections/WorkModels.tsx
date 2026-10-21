'use client'

import { useRef } from 'react'
import { Eyebrow, Title, clamp, span, useLoop, useReducedMotion, useViewport } from './kit'

// the chart is drawn in a 560 × 620 design space and scaled with its box
const W = 560, H = 620
type P = [number, number]
type Tone = 'copper' | 'olive'
type Edge = { pts: P[]; tone: Tone; dashed?: boolean }
type Crew = { at: P; n: number; cols: number }
type Model = {
  title: string
  desc: string
  cap: string
  sr: string
  hub: string
  nodes: Record<string, P> // role cards by key, `O` is the hub
  zones: ([number, number, number, number] | null)[] // project sites: x, y, w, h
  crews: (Crew | null)[] // workers on each site
  edges: Edge[]
  chip?: { text: string; at: P }
  scope: { route: number[]; tag: string; at: P } // edges the highlight travels, then the tag it leaves
}

const ROLES: Record<string, string> = { PM1: 'Project manager', PM2: 'Project manager', S1: 'Site supervisor', S2: 'Site supervisor', AD: 'Admin', SA: 'Sales' }
const SITES = ['Sabarmati', 'Bopal']
const STROKE: Record<Tone, string> = { copper: 'var(--color-copper)', olive: 'var(--color-olive)' }
const MAX_CREW = 8
const GAP = 20 // between worker dots

const MODELS: Model[] = [
  {
    title: 'The hands-on builder',
    desc: 'You’re on site most days. No layers in between: every site and every crew connects straight to you.',
    cap: 'One person, every site',
    sr: 'The owner is linked directly to two project sites, Sabarmati and Bopal, and to the workers on each.',
    hub: 'Owner',
    nodes: { O: [280, 104] },
    zones: [[36, 300, 230, 170], [294, 300, 230, 170]],
    crews: [{ at: [151, 384], n: 6, cols: 3 }, { at: [409, 384], n: 5, cols: 3 }],
    edges: [
      { pts: [[280, 104], [280, 214], [151, 214], [151, 354]], tone: 'copper' },
      { pts: [[280, 104], [280, 214], [409, 214], [409, 354]], tone: 'olive' },
    ],
    scope: { route: [0, 1], tag: 'Sees: every site', at: [280, 40] },
  },
  {
    title: 'The growing company',
    desc: 'Project managers each run a site with their own supervisor. Admin and sales sit alongside. You keep the whole picture.',
    cap: 'Roles split, one view on top',
    sr: 'The owner sits above an admin, a sales user and two project managers. Each project manager has a site with a site supervisor and workers. The Sabarmati supervisor sees Sabarmati only.',
    hub: 'Owner',
    nodes: { O: [280, 60], AD: [80, 60], SA: [480, 60], PM1: [151, 186], PM2: [409, 186], S1: [151, 322], S2: [409, 322] },
    zones: [[36, 262, 230, 256], [294, 262, 230, 256]],
    crews: [{ at: [151, 446], n: 6, cols: 3 }, { at: [409, 446], n: 5, cols: 3 }],
    edges: [
      { pts: [[280, 60], [280, 124], [151, 124], [151, 186]], tone: 'copper' },
      { pts: [[280, 60], [280, 124], [409, 124], [409, 186]], tone: 'olive' },
      { pts: [[151, 186], [151, 322]], tone: 'copper' },
      { pts: [[409, 186], [409, 322]], tone: 'olive' },
      { pts: [[151, 322], [151, 416]], tone: 'copper' },
      { pts: [[409, 322], [409, 416]], tone: 'olive' },
      { pts: [[280, 60], [80, 60]], tone: 'olive' },
      { pts: [[280, 60], [480, 60]], tone: 'copper' },
    ],
    scope: { route: [0, 2], tag: 'Sees: Sabarmati only', at: [151, 376] },
  },
  {
    title: 'The builder who delegates',
    desc: 'The site runs through your supervisor. What comes back up is a summary, and each record shows who added it.',
    cap: 'Work goes down, a summary comes back',
    sr: 'The owner hands the Sabarmati site to a site supervisor, who manages the workers. A summary returns to the owner, and each entry shows who added it.',
    hub: 'Owner',
    nodes: { O: [280, 84], S1: [280, 268] },
    zones: [[120, 196, 320, 316], null],
    crews: [{ at: [280, 418], n: 8, cols: 4 }, null],
    edges: [
      { pts: [[280, 84], [280, 268]], tone: 'copper' },
      { pts: [[280, 268], [280, 388]], tone: 'copper' },
      { pts: [[280, 268], [492, 268], [492, 84], [280, 84]], tone: 'olive', dashed: true },
    ],
    chip: { text: 'Summary', at: [492, 170] },
    scope: { route: [2], tag: 'Each entry shows who added it', at: [280, 24] },
  },
  {
    title: 'The independent contractor',
    desc: 'A small, flat setup. Your own projects and your own crews, all in your hands.',
    cap: 'Small, flat and yours',
    sr: 'The contractor is linked directly to two of their own projects and the workers on each.',
    hub: 'Contractor',
    nodes: { O: [280, 286] },
    zones: [[28, 156, 172, 260], [360, 156, 172, 260]],
    crews: [{ at: [114, 286], n: 4, cols: 2 }, { at: [446, 286], n: 3, cols: 2 }],
    edges: [
      { pts: [[280, 286], [140, 286]], tone: 'copper' },
      { pts: [[280, 286], [420, 286]], tone: 'olive' },
    ],
    scope: { route: [0, 1], tag: 'Sees: own projects', at: [280, 348] },
  },
]

/** a right-angled line with rounded corners: its path, its length and a point sampler */
function route(pts: P[], r = 16) {
  type Piece = { len: number; at: (k: number) => P }
  const pieces: Piece[] = []
  const line = (a: P, b: P) => pieces.push({ len: Math.hypot(b[0] - a[0], b[1] - a[1]), at: k => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k] })
  const toward = (a: P, b: P, d: number): P => {
    const l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1
    return [a[0] + ((b[0] - a[0]) * d) / l, a[1] + ((b[1] - a[1]) * d) / l]
  }
  let d = `M${pts[0][0]} ${pts[0][1]}`
  let cur = pts[0]
  for (let i = 1; i < pts.length - 1; i++) {
    const v = pts[i]
    const rr = Math.min(r, Math.hypot(v[0] - pts[i - 1][0], v[1] - pts[i - 1][1]) / 2, Math.hypot(pts[i + 1][0] - v[0], pts[i + 1][1] - v[1]) / 2)
    const a = toward(v, pts[i - 1], rr), b = toward(v, pts[i + 1], rr)
    line(cur, a)
    pieces.push({ len: rr * 1.623, at: k => [(1 - k) ** 2 * a[0] + 2 * k * (1 - k) * v[0] + k * k * b[0], (1 - k) ** 2 * a[1] + 2 * k * (1 - k) * v[1] + k * k * b[1]] })
    d += ` L${a[0]} ${a[1]} Q${v[0]} ${v[1]} ${b[0]} ${b[1]}`
    cur = b
  }
  const end = pts[pts.length - 1]
  line(cur, end)
  d += ` L${end[0]} ${end[1]}`
  const len = pieces.reduce((s, p) => s + p.len, 0)
  const at = (u: number): P => {
    let left = clamp(u) * len
    for (const p of pieces) {
      if (left <= p.len) return p.at(p.len ? left / p.len : 0)
      left -= p.len
    }
    return end
  }
  return { d, len, at }
}
const ROUTES = MODELS.map(m => m.edges.map(e => route(e.pts)))

/** where worker `i` of a crew stands */
function crewDot(c: Crew, i: number): P {
  const rows = Math.ceil(c.n / c.cols), row = Math.floor(i / c.cols)
  const inRow = row === rows - 1 ? c.n - c.cols * (rows - 1) : c.cols
  return [c.at[0] + ((i % c.cols) - (inRow - 1) / 2) * GAP, c.at[1] + (row - (rows - 1) / 2) * GAP]
}

const pct = (x: number, y: number) => ({ left: `${(x / W) * 100}%`, top: `${(y / H) * 100}%` })
const EASE = 'cubic-bezier(0.65, 0, 0.35, 1)'
const STEP = 7.5 // seconds per way of working
const SETTLE = 0.4, FLOW = 1.4, SCOPE = 3.1, TAG = 4.2, TAG_OUT = 6.9 // beats within a step
const SPEED = 75 // design units a dot travels per second

export default function WorkModels() {
  const reduced = useReducedMotion()
  const { ref, visible } = useViewport<HTMLDivElement>('0px', 0.3)
  const { t, seek } = useLoop(STEP * MODELS.length, visible && !reduced)
  const active = Math.floor(t / STEP) % MODELS.length
  const s = reduced ? TAG + 1 : t % STEP // reduced motion shows each chart settled
  const progress = reduced ? 0 : s / STEP
  const tabs = useRef<(HTMLButtonElement | null)[]>([])
  const M = MODELS[active]
  const move = reduced ? 'none' : `all 0.8s ${EASE}`
  const drawn = s > SETTLE

  // the scope highlight runs along its edges one after another
  const scopeLen = M.scope.route.reduce((n, i) => n + ROUTES[active][i].len, 0)
  const scopeAt = span(s, SCOPE, TAG) * scopeLen
  const scopeOn = s >= SCOPE && s < TAG_OUT
  const tagOn = s >= TAG && s < TAG_OUT

  const pick = (i: number, focus = false) => {
    seek(i * STEP)
    if (focus) tabs.current[i]?.focus()
  }
  const onKey = (e: React.KeyboardEvent) => {
    const d = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 }[e.key]
    if (d) {
      e.preventDefault()
      pick((active + d + MODELS.length) % MODELS.length, true)
    } else if (e.key === 'Home' || e.key === 'End') {
      e.preventDefault()
      pick(e.key === 'Home' ? 0 : MODELS.length - 1, true)
    }
  }

  return (
    <section aria-labelledby="models-title" className="bg-cream py-[clamp(84px,10vw,140px)]">
      <div ref={ref} className="shell grid gap-12 lg:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)] lg:items-center lg:gap-[clamp(40px,5vw,88px)]">
        <div>
          <Eyebrow>02 / Your work. Your way.</Eyebrow>
          <Title id="models-title" className="mt-5 text-coffee">
            You don’t all build the same way. Neither do we.
          </Title>
          <p className="mt-6 max-w-[46ch] text-[17px] font-medium leading-relaxed text-ink/75">
            NirmanSite is a construction management app for Indian builders and contractors. Record daily site work on mobile and review project records in the web workspace, whether you run one project yourself or share responsibilities across a team.
          </p>

          <div role="tablist" aria-label="Ways of working" aria-orientation="vertical" className="mt-9 flex flex-col gap-1.5" onKeyDown={onKey}>
            {MODELS.map((m, i) => {
              const on = i === active
              return (
                <button
                  key={m.title}
                  ref={el => {
                    tabs.current[i] = el
                  }}
                  type="button"
                  role="tab"
                  id={`model-tab-${i}`}
                  aria-selected={on}
                  aria-controls="model-panel"
                  tabIndex={on ? 0 : -1}
                  onClick={() => pick(i)}
                  className={`relative cursor-pointer overflow-hidden rounded-2xl border px-5 py-4 text-left transition-[background-color,border-color] duration-300 ${
                    on ? 'border-coffee/[0.12] bg-white shadow-[0_18px_40px_-30px_rgb(42_33_27/0.5)]' : 'border-transparent hover:bg-white/50'
                  }`}
                >
                  <span className="flex items-center gap-4">
                    <span className={`text-[13px] font-extrabold tabular-nums transition-colors ${on ? 'text-copper-700' : 'text-muted'}`}>{String(i + 1).padStart(2, '0')}</span>
                    <span className="text-[18.5px] font-bold tracking-[-0.01em] text-coffee">{m.title}</span>
                  </span>
                  <span className={`grid transition-[grid-template-rows,opacity] duration-500 ease-out ${on ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
                    <span className="overflow-hidden">
                      <span className="block pl-[33px] pt-2 text-[15px] font-medium leading-relaxed text-ink/70">{m.desc}</span>
                    </span>
                  </span>
                  {on && <span aria-hidden="true" className="absolute bottom-0 left-0 h-[2px] w-full origin-left bg-copper" style={{ scale: `${progress} 1`, transition: 'scale 80ms linear' }} />}
                </button>
              )
            })}
          </div>
          <p className="mt-6 pl-5 text-[14px] font-semibold text-muted">What each person sees follows their role and project.</p>
        </div>

        {/* the same people, re-wired for each way of working */}
        <div
          id="model-panel"
          role="tabpanel"
          aria-labelledby={`model-tab-${active}`}
          className="@container relative aspect-[560/620] overflow-hidden rounded-[28px] border border-coffee/[0.08] bg-paper bg-[radial-gradient(rgb(42_33_27/0.11)_1px,transparent_1px)] bg-[size:22px_22px]"
        >
          <p className="sr-only">
            {M.title}: {M.sr} Workers are recorded by the team and need no app login.
          </p>
          <div aria-hidden="true" className="absolute inset-0">
            {/* project sites */}
            {SITES.map((name, i) => {
              const z = M.zones[i]
              const [x, y, w, h] = z ?? MODELS[0].zones[i]!
              return (
                <span
                  key={name}
                  className="absolute rounded-[3.4cqw] border-[1.5px] border-dashed border-coffee/25 bg-white/45"
                  style={{ ...pct(x, y), width: `${(w / W) * 100}%`, height: `${(h / H) * 100}%`, opacity: z ? 1 : 0, transition: move }}
                >
                  <span className="absolute left-[3cqw] top-0 -translate-y-1/2 rounded-full bg-coffee px-[1.9cqw] py-[0.5cqw] text-[clamp(9.5px,1.95cqw,12px)] font-extrabold uppercase tracking-[0.12em] text-cream">
                    {name}
                  </span>
                </span>
              )
            })}

            {/* connectors, one set per arrangement; the active set draws itself in */}
            <svg viewBox={`0 0 ${W} ${H}`} className="absolute inset-0 size-full overflow-visible" fill="none">
              {MODELS.map((m, mi) =>
                m.edges.map((e, ei) => {
                  const on = mi === active && drawn
                  const { d, len } = ROUTES[mi][ei]
                  return (
                    <path
                      key={`${mi}-${ei}`}
                      d={d}
                      stroke={STROKE[e.tone]}
                      strokeWidth={2}
                      strokeLinecap="round"
                      strokeOpacity={0.5}
                      strokeDasharray={e.dashed ? '2 7' : len}
                      strokeDashoffset={e.dashed || on ? 0 : len}
                      style={{
                        opacity: on ? 1 : 0,
                        transition: reduced ? 'none' : on ? `stroke-dashoffset 0.9s ${EASE}, opacity 0.4s` : 'opacity 0.25s, stroke-dashoffset 0s 0.3s',
                      }}
                    />
                  )
                }),
              )}

              {/* the scope highlight */}
              {(() => {
                let before = 0
                return M.scope.route.map(ei => {
                  const { d, len, at } = ROUTES[active][ei]
                  const done = clamp((scopeAt - before) / len)
                  const head = done > 0 && done < 1 ? at(done) : null
                  before += len
                  return (
                    <g key={`${active}-scope-${ei}`} style={{ opacity: scopeOn ? 1 : 0, transition: reduced ? 'none' : 'opacity 0.4s' }}>
                      <path d={d} stroke="var(--color-copper)" strokeWidth={3.5} strokeLinecap="round" strokeDasharray={len} strokeDashoffset={len * (1 - done)} style={{ transition: reduced ? 'none' : 'stroke-dashoffset 80ms linear' }} />
                      {head && <circle r={6} fill="var(--color-copper)" style={{ transform: `translate(${head[0]}px, ${head[1]}px)`, transition: 'transform 80ms linear' }} />}
                    </g>
                  )
                })
              })()}

              {/* dots moving along each line */}
              {!reduced &&
                M.edges.map((e, ei) => {
                  const { len, at } = ROUTES[active][ei]
                  const u = ((s * SPEED) / Math.max(len, 160) + ei * 0.37) % 1
                  const [x, y] = at(u)
                  const show = s > FLOW ? clamp(Math.min(u, 1 - u) / 0.14) : 0
                  return (
                    <circle
                      key={`${active}-dot-${ei}`}
                      r={4.5}
                      fill={STROKE[e.tone]}
                      style={{ transform: `translate(${x}px, ${y}px)`, opacity: show, transition: 'transform 80ms linear, opacity 160ms linear' }}
                    />
                  )
                })}
            </svg>

            {/* workers: plain dots, no role card, because they have no login */}
            {M.crews.map((_, ci) =>
              Array.from({ length: MAX_CREW }, (_, i) => {
                const c = M.crews[ci]
                const on = !!c && i < c.n
                const [x, y] = on ? crewDot(c, i) : (c?.at ?? M.nodes.O)
                return (
                  <span
                    key={`${ci}-${i}`}
                    className="absolute aspect-square w-[2.1%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-coffee/45"
                    style={{ ...pct(x, y), opacity: on ? 1 : 0, transition: move, transitionDelay: reduced ? undefined : `${i * 25}ms` }}
                  />
                )
              }),
            )}
            {M.crews.map((c, ci) => {
              const [x, y] = c ? [c.at[0], c.at[1] + Math.ceil(c.n / c.cols) * (GAP / 2) + 16] : M.nodes.O
              return (
                <span
                  key={ci}
                  className="absolute -translate-x-1/2 -translate-y-1/2 whitespace-nowrap text-[clamp(9.5px,2cqw,12px)] font-bold text-muted"
                  style={{ ...pct(x, y), opacity: c ? 1 : 0, transition: move }}
                >
                  Workers
                </span>
              )
            })}

            {/* the hub glows softly behind whoever sits at the centre */}
            <span
              className="absolute size-[38%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(closest-side,rgb(193_108_49/0.22),transparent)]"
              style={{ ...pct(...M.nodes.O), transition: move }}
            />

            {/* role cards */}
            {['O', ...Object.keys(ROLES)].map(k => {
              const hub = k === 'O'
              const on = k in M.nodes
              const [x, y] = M.nodes[k] ?? M.nodes.O
              return (
                <span
                  key={k}
                  className={`absolute flex -translate-x-1/2 -translate-y-1/2 items-center justify-center gap-[1.3cqw] rounded-[2.6cqw] border px-[1cqw] text-center font-bold leading-[1.1] shadow-[0_16px_30px_-18px_rgb(42_33_27/0.55)] ${
                    hub
                      ? 'z-[1] h-[9.4%] w-[25%] border-coffee bg-coffee text-[clamp(12px,2.9cqw,17px)] text-cream'
                      : 'h-[8%] w-[22.4%] border-coffee/[0.12] bg-white text-[clamp(10.5px,2.35cqw,14px)] text-coffee'
                  }`}
                  style={{ ...pct(x, y), opacity: on ? 1 : 0, scale: on ? '1' : '0.6', transition: move }}
                >
                  <span className={`hidden size-[7px] shrink-0 rounded-full @min-[460px]:block ${hub ? 'bg-copper-400' : 'bg-olive'}`} />
                  {hub ? M.hub : ROLES[k]}
                </span>
              )
            })}

            {/* a label on a line, and the scope tag the highlight leaves behind */}
            {MODELS.map(
              (m, mi) =>
                m.chip && (
                  <span
                    key={mi}
                    className="absolute z-[1] -translate-x-1/2 -translate-y-1/2 whitespace-nowrap rounded-full border border-olive/30 bg-olive-100 px-[1.8cqw] py-[0.6cqw] text-[clamp(9.5px,2.05cqw,12.5px)] font-extrabold text-olive-700"
                    style={{ ...pct(...m.chip.at), opacity: mi === active && drawn ? 1 : 0, transition: reduced ? 'none' : 'opacity 0.5s' }}
                  >
                    {m.chip.text}
                  </span>
                ),
            )}
            {MODELS.map((m, mi) => {
              const on = mi === active && tagOn
              return (
                <span
                  key={mi}
                  className="absolute z-[2] -translate-x-1/2 -translate-y-1/2 whitespace-nowrap rounded-full border border-copper/40 bg-copper-100 px-[2cqw] py-[0.7cqw] text-[clamp(10px,2.15cqw,13px)] font-extrabold text-copper-700 shadow-[0_10px_22px_-14px_rgb(154_82_32/0.8)]"
                  style={{ ...pct(...m.scope.at), opacity: on ? 1 : 0, scale: on ? '1' : '0.85', transition: reduced ? 'none' : `opacity 0.35s, scale 0.45s ${EASE}` }}
                >
                  {m.scope.tag}
                </span>
              )
            })}
          </div>

          <div className="absolute inset-x-[5%] bottom-[3.2%] flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-[clamp(11px,2.3cqw,13px)] font-bold text-muted">
            <p>{M.cap}</p>
            <p className="flex items-center gap-[7px] font-semibold">
              <span aria-hidden="true" className="size-[7px] rounded-full bg-coffee/45" />
              Workers need no app login
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
