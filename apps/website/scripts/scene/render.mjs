// Renders the hero scene layers to transparent PNGs (offline, headless Chrome + WebGL/SwiftShader).
//   node scripts/scene/render.mjs [--w=1600] [--framing=desktop|mobile|all] [--layers=far,building,grass] [--project-only]
// Output: scripts/scene/out/<framing>-<layer>.png and scripts/scene/out/hotspots.json
import { build } from 'esbuild'
import puppeteer from 'puppeteer-core'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(here, '../..')
const arg = Object.fromEntries(process.argv.slice(2).map(a => a.replace(/^--/, '').split('=')))
const W = +(arg.w || 1600)
const framings = arg.framing && arg.framing !== 'all' ? arg.framing.split(',') : ['desktop', 'mobile']
const LAYERS = 'project-only' in arg ? [] : (arg.layers || 'far,building,grass').split(',')
const SIZE = { desktop: [W, Math.round(W / 2.2)], mobile: [Math.round(W * 0.2818), Math.round(W * 0.4545)] }

const out = path.join(here, 'out')
const tmp = path.join(here, '.build')
fs.mkdirSync(out, { recursive: true })
fs.mkdirSync(tmp, { recursive: true })
await build({ entryPoints: [path.join(here, 'scene.js')], bundle: true, format: 'iife', globalName: 'NS', outfile: path.join(tmp, 'scene.js'), logLevel: 'warning' })
const logo = path.join(root, 'src/assets/brand/horizontal-logo.png')
fs.writeFileSync(
  path.join(tmp, 'index.html'),
  `<!doctype html><html><body style="margin:0;background:transparent"><img id="logo" src="file://${logo}"><script src="scene.js"></script></body></html>`,
)

const browser = await puppeteer.launch({
  executablePath: '/usr/bin/google-chrome',
  headless: true,
  protocolTimeout: 600000,
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--allow-file-access-from-files'],
})
const page = await browser.newPage()
page.on('console', m => console.log('[page]', m.text()))
page.on('pageerror', e => console.log('[pageerror]', e.message))
await page.goto('file://' + path.join(tmp, 'index.html'), { waitUntil: 'load' })

// site hoarding artwork: cream panel, olive bands, the real NirmanSite logo
await page.evaluate(async () => {
  const img = document.getElementById('logo')
  await img.decode()
  const c = document.createElement('canvas')
  c.width = 1464
  c.height = 240
  const x = c.getContext('2d')
  x.fillStyle = '#f3eee4'
  x.fillRect(0, 0, c.width, c.height)
  x.fillStyle = '#5f6844'
  x.fillRect(0, 0, c.width, 26)
  x.fillRect(0, c.height - 26, c.width, 26)
  const h = 116, w = (img.naturalWidth / img.naturalHeight) * h
  x.drawImage(img, (c.width - w) / 2, (c.height - h) / 2, w, h)
  x.fillStyle = 'rgba(95,104,68,0.35)'
  x.fillRect(0, 26, 6, c.height - 52)
  NS.addHoarding(c)
})

for (const f of framings) {
  const [w, h] = SIZE[f]
  for (const layer of LAYERS) {
    const t0 = Date.now()
    const url = await page.evaluate((l, f, w, h) => NS.render(l, f, w, h), layer, f, w, h)
    fs.writeFileSync(path.join(out, `${f}-${layer}.png`), Buffer.from(url.split(',')[1], 'base64'))
    console.log(`${f}-${layer}.png  ${w}x${h}  ${((Date.now() - t0) / 1000).toFixed(1)}s`)
  }
}

// hotspot anchors (defined in scene.js) → screen fractions per framing
const proj = {}
for (const f of ['desktop', 'mobile']) proj[f] = await page.evaluate(f => NS.project(f), f)
fs.writeFileSync(path.join(out, 'hotspots.json'), JSON.stringify(proj, null, 2))
console.log('hotspots', JSON.stringify(proj))
await browser.close()
