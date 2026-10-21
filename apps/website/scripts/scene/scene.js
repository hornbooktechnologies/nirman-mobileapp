// Hero scene for the NirmanSite website, rendered offline into transparent layers
// (far · building · grass) that the page stacks with parallax. Bundled by render.mjs.
import * as THREE from 'three'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'

// ---------------------------------------------------------------- helpers
function rng(seed) {
  return () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646
}
const R = rng(20260928)
const rand = (a, b) => a + (b - a) * R()

function box(w, h, d, x, y, z, rot = 0) {
  const g = new THREE.BoxGeometry(w, h, d)
  if (rot) g.rotateY(rot)
  g.translate(x, y, z)
  return g
}
function beam(ax, ay, az, bx, by, bz, t) {
  // thin box from point a to point b (for lattice members)
  const a = new THREE.Vector3(ax, ay, az), b = new THREE.Vector3(bx, by, bz)
  const len = a.distanceTo(b)
  const g = new THREE.BoxGeometry(t, len, t)
  const mid = a.clone().add(b).multiplyScalar(0.5)
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize())
  g.applyMatrix4(new THREE.Matrix4().compose(mid, q, new THREE.Vector3(1, 1, 1)))
  return g
}
function mesh(geoms, mat, { cast = true, receive = true } = {}) {
  const m = new THREE.Mesh(Array.isArray(geoms) ? mergeGeometries(geoms) : geoms, mat)
  m.castShadow = cast
  m.receiveShadow = receive
  return m
}
function noiseTexture(size, base, amp, streaks = 0) {
  const c = document.createElement('canvas')
  c.width = c.height = size
  const x = c.getContext('2d')
  const img = x.createImageData(size, size)
  for (let i = 0; i < size * size; i++) {
    const n = (R() - 0.5) * amp + (streaks ? Math.sin((i % size) * 0.05) * streaks : 0)
    img.data[i * 4] = base[0] + n
    img.data[i * 4 + 1] = base[1] + n
    img.data[i * 4 + 2] = base[2] + n
    img.data[i * 4 + 3] = 255
  }
  x.putImageData(img, 0, 0)
  const t = new THREE.CanvasTexture(c)
  t.wrapS = t.wrapT = THREE.RepeatWrapping
  t.colorSpace = THREE.SRGBColorSpace
  t.anisotropy = 8
  return t
}
// value noise for terrain
function vnoise(x, y) {
  const h = (i, j) => {
    const s = Math.sin(i * 127.1 + j * 311.7) * 43758.5453
    return s - Math.floor(s)
  }
  const i = Math.floor(x), j = Math.floor(y), fx = x - i, fy = y - j
  const u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy)
  return h(i, j) * (1 - u) * (1 - v) + h(i + 1, j) * u * (1 - v) + h(i, j + 1) * (1 - u) * v + h(i + 1, j + 1) * u * v
}
const fbm = (x, y) => vnoise(x, y) * 0.55 + vnoise(x * 2.1, y * 2.1) * 0.28 + vnoise(x * 4.3, y * 4.3) * 0.12 + vnoise(x * 8.7, y * 8.7) * 0.05

// ---------------------------------------------------------------- renderer + world
export const FOG = new THREE.Color('#eddcc6') // must match the CSS sky at the horizon
const SUN_DIR = new THREE.Vector3(-120, 58, 42).normalize()

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true })
renderer.setPixelRatio(1)
renderer.outputColorSpace = THREE.SRGBColorSpace
renderer.toneMapping = THREE.ACESFilmicToneMapping
renderer.toneMappingExposure = 1.0
renderer.shadowMap.enabled = true
renderer.shadowMap.type = THREE.PCFShadowMap
renderer.setClearColor(0x000000, 0)
document.body.appendChild(renderer.domElement)

const scene = new THREE.Scene()
scene.fog = new THREE.FogExp2(FOG, 0.0006)
const pmrem = new THREE.PMREMGenerator(renderer)
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture
scene.environmentIntensity = 0.26

const sun = new THREE.DirectionalLight('#ffcf98', 5.4)
sun.position.copy(SUN_DIR).multiplyScalar(200).add(new THREE.Vector3(20, 0, -100))
sun.target.position.set(20, 0, -100)
sun.castShadow = true
sun.shadow.mapSize.set(4096, 4096)
Object.assign(sun.shadow.camera, { left: -75, right: 75, top: 75, bottom: -45, near: 20, far: 420 })
sun.shadow.bias = -0.0003
sun.shadow.normalBias = 0.05
sun.shadow.radius = 3
scene.add(sun, sun.target)
scene.add(new THREE.HemisphereLight('#c9d8e6', '#a08459', 0.42))

// load = the crane's hoist ropes + steel bundle, a layer of its own so the page can lift it
const layers = { far: new THREE.Group(), building: new THREE.Group(), grass: new THREE.Group(), load: new THREE.Group() }
Object.values(layers).forEach(g => scene.add(g))

// ---------------------------------------------------------------- materials
const concreteMap = noiseTexture(512, [208, 201, 190], 22)
concreteMap.repeat.set(6, 6)
const M = {
  concrete: new THREE.MeshStandardMaterial({ color: '#d8d1c5', map: concreteMap, roughness: 0.93 }),
  concreteDark: new THREE.MeshStandardMaterial({ color: '#b9b0a2', map: concreteMap, roughness: 0.95 }),
  interior: new THREE.MeshStandardMaterial({ color: '#4a433c', roughness: 1 }),
  plaster: new THREE.MeshStandardMaterial({ color: '#eee8de', roughness: 0.85 }),
  spandrel: new THREE.MeshStandardMaterial({ color: '#d9d1c4', roughness: 0.7 }),
  glass: new THREE.MeshPhysicalMaterial({ color: '#4c5d64', metalness: 0.05, roughness: 0.05, envMapIntensity: 1.9, clearcoat: 0.8 }),
  glassLight: new THREE.MeshPhysicalMaterial({ color: '#8a9ea3', metalness: 0.05, roughness: 0.04, envMapIntensity: 2.2, clearcoat: 0.8 }),
  frame: new THREE.MeshStandardMaterial({ color: '#e6e1d8', roughness: 0.55, metalness: 0.2 }),
  rail: new THREE.MeshStandardMaterial({ color: '#4c4640', roughness: 0.35, metalness: 0.7 }),
  plywood: new THREE.MeshStandardMaterial({ color: '#c79c61', roughness: 0.8 }),
  scaffold: new THREE.MeshStandardMaterial({ color: '#a6a9ab', roughness: 0.4, metalness: 0.75 }),
  net: new THREE.MeshStandardMaterial({ color: '#4d5c3c', roughness: 0.9, transparent: true, opacity: 0.46, side: THREE.DoubleSide }),
  crane: new THREE.MeshStandardMaterial({ color: '#e3a53a', roughness: 0.55, metalness: 0.25 }),
  craneDark: new THREE.MeshStandardMaterial({ color: '#34302c', roughness: 0.6, metalness: 0.4 }),
  weight: new THREE.MeshStandardMaterial({ color: '#a8a196', map: concreteMap, roughness: 0.95 }),
  steel: new THREE.MeshStandardMaterial({ color: '#5b5550', roughness: 0.5, metalness: 0.7 }),
  rebar: new THREE.MeshStandardMaterial({ color: '#6d5c4c', roughness: 0.7, metalness: 0.5 }),
  brick: new THREE.MeshStandardMaterial({ color: '#b36c47', roughness: 0.95 }),
  sand: new THREE.MeshStandardMaterial({ color: '#d2b98f', roughness: 1 }),
  cabin: new THREE.MeshStandardMaterial({ color: '#f1ede5', roughness: 0.6 }),
  cabinTrim: new THREE.MeshStandardMaterial({ color: '#676f4b', roughness: 0.6 }),
}

// ---------------------------------------------------------------- the building
const B = { x0: 5, x1: 35, zf: -92, zb: -108, floors: 9, fh: 3.3, finished: 6 }
const tower = new THREE.Group() // the building itself, turned so two faces catch the light differently
tower.position.set(20, 0, -100)
tower.rotation.y = THREE.MathUtils.degToRad(18)
layers.building.add(tower)
const inner = new THREE.Group()
inner.position.set(-20, 0, 100)
tower.add(inner)
export const anchors = {}
function anchor(name, x, y, z) {
  const o = new THREE.Object3D()
  o.position.set(x, y, z)
  inner.add(o)
  anchors[name] = o
}
anchor('progress', 9, 21.3, -91.2) // first open floor above the finished ones (clear of the crane load)
anchor('wages', 30, 11.2, -91.3) // finished floors
// per-framing overrides: on portrait screens the wages marker sits higher, clear of the phone card
const framingAnchors = { desktop: {}, mobile: {} }
function anchorFor(framing, name, x, y, z) {
  const o = new THREE.Object3D()
  o.position.set(x, y, z)
  inner.add(o)
  framingAnchors[framing][name] = o
}
anchorFor('mobile', 'wages', 29, 17.6, -91.3)
{
  const g = inner
  const cols = [5, 11, 17, 23, 29, 35], rows = [-92, -100, -108]
  const W = B.x1 - B.x0, D = B.zf - B.zb, cx = (B.x0 + B.x1) / 2, cz = (B.zf + B.zb) / 2
  const slabs = [], columns = [], interior = [], spand = [], glassG = [], glassL = [], frames = [], rails = [], plaster = [], ply = [], rebar = []
  for (let f = 0; f <= B.floors; f++) {
    const y = f * B.fh
    const over = f > 0 && f <= B.finished ? 0.9 : 0.25 // balconies on finished floors
    slabs.push(box(W + 0.6, 0.32, D + over + 0.3, cx, y + 0.16, cz + over / 2))
  }
  for (let f = 0; f < B.floors; f++) {
    const y0 = f * B.fh + 0.32, h = B.fh - 0.32, yc = y0 + h / 2
    for (const x of cols) for (const z of rows) columns.push(box(0.55, h, 0.55, x, yc, z))
    if (f < B.finished) {
      // front facade: spandrel + glazing with mullions, set back 0.9 m (balcony)
      const zf = B.zf - 0.05
      spand.push(box(W, 0.9, 0.2, cx, y0 + 0.45, zf))
      for (let x = B.x0; x < B.x1 - 0.01; x += 3) (R() > 0.62 ? glassL : glassG).push(box(3, h - 1.05, 0.06, x + 1.5, y0 + 0.9 + (h - 1.05) / 2, zf))
      for (let x = B.x0; x <= B.x1 + 0.01; x += 1.5) frames.push(box(0.09, h - 0.9, 0.14, x, y0 + 0.9 + (h - 0.9) / 2, zf + 0.06))
      frames.push(box(W, 0.09, 0.14, cx, y0 + 0.92, zf + 0.06))
      // balcony rail
      if (f > 0) {
        rails.push(box(W + 0.4, 0.06, 0.06, cx, y0 + 1.05, B.zf + 0.85))
        for (let x = B.x0; x <= B.x1; x += 1.2) rails.push(box(0.035, 1.0, 0.035, x, y0 + 0.52, B.zf + 0.85))
      }
      // side walls with punched windows (the sunlit −x face)
      plaster.push(box(0.25, h, D, B.x0 - 0.1, yc, cz))
      for (let z = B.zb + 2; z < B.zf - 1; z += 4) glassG.push(box(0.1, 1.5, 2, B.x0 - 0.25, y0 + 1.5, z))
      plaster.push(box(0.25, h, D, B.x1 + 0.1, yc, cz))
      plaster.push(box(W, h, 0.25, cx, yc, B.zb + 0.1))
    } else {
      interior.push(box(W - 1.5, h, D - 1.5, cx, yc, cz - 0.3))
    }
  }
  // stair / lift core above the roof, rebar starters and formwork at the working level
  const top = B.floors * B.fh + 0.32
  columns.push(box(6, 3.2, 5, 27, top + 1.6, -103))
  for (const x of cols) for (const z of rows) for (let k = 0; k < 4; k++) rebar.push(box(0.03, 1.3, 0.03, x - 0.18 + (k % 2) * 0.36, top + 0.65, z - 0.18 + Math.floor(k / 2) * 0.36))
  ply.push(box(W * 0.55, 0.7, 0.05, B.x0 + W * 0.3, top + 0.35, B.zf + 0.15))
  g.add(mesh(slabs, M.concrete), mesh(columns, M.concrete), mesh(interior, M.interior, { cast: false }), mesh(spand, M.spandrel), mesh(glassG, M.glass, { cast: false }), mesh(glassL, M.glassLight, { cast: false }), mesh(frames, M.frame), mesh(rails, M.rail), mesh(plaster, M.plaster), mesh(ply, M.plywood), mesh(rebar, M.rebar))

  // scaffolding + netting on the front of the structural floors
  const sc = [], boards = []
  const s0 = B.finished * B.fh, s1 = B.floors * B.fh + 1.6, zs = B.zf + 1.1
  for (let x = B.x0 - 0.6; x <= B.x1 + 0.7; x += 2.1) {
    sc.push(box(0.06, s1 - s0, 0.06, x, s0 + (s1 - s0) / 2, zs), box(0.06, s1 - s0, 0.06, x, s0 + (s1 - s0) / 2, zs + 0.9))
  }
  for (let y = s0 + 0.3; y <= s1; y += 1.65) {
    sc.push(box(B.x1 - B.x0 + 1.3, 0.05, 0.05, (B.x0 + B.x1) / 2, y, zs), box(B.x1 - B.x0 + 1.3, 0.05, 0.05, (B.x0 + B.x1) / 2, y, zs + 0.9))
    boards.push(box(B.x1 - B.x0 + 1.2, 0.04, 0.85, (B.x0 + B.x1) / 2, y - 0.03, zs + 0.45))
  }
  for (let x = B.x0 - 0.6; x < B.x1; x += 4.2) sc.push(beam(x, s0 + 0.3, zs + 0.9, x + 2.1, s0 + 3.6, zs + 0.9, 0.05))
  g.add(mesh(sc, M.scaffold), mesh(boards, M.plywood))

  // a few workers on the working level (hi-vis vests, hard hats) for scale
  const vest = new THREE.MeshStandardMaterial({ color: '#e8792f', roughness: 0.8 })
  const skin = new THREE.MeshStandardMaterial({ color: '#7a5238', roughness: 0.9 })
  const hat = new THREE.MeshStandardMaterial({ color: '#f2f0ea', roughness: 0.5 })
  const legs = new THREE.MeshStandardMaterial({ color: '#3d3f47', roughness: 0.9 })
  const topY = B.floors * B.fh + 0.32
  for (const [x, z, r] of [[9.5, -93.4, 0.4], [16.2, -94.6, -0.9], [27.5, -93.8, 2.2]]) {
    const w = new THREE.Group()
    const l = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.85, 0.22), legs)
    l.position.y = 0.43
    const t = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.62, 0.26), vest)
    t.position.y = 1.16
    const hd = new THREE.Mesh(new THREE.SphereGeometry(0.12, 10, 8), skin)
    hd.position.y = 1.6
    const ht = new THREE.Mesh(new THREE.SphereGeometry(0.14, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), hat)
    ht.position.y = 1.66
    w.add(l, t, hd, ht)
    w.traverse(o => (o.castShadow = true))
    w.position.set(x, topY, z)
    w.rotation.y = r
    g.add(w)
  }
  const net = new THREE.Mesh(new THREE.PlaneGeometry(13, s1 - s0 - 0.4), M.net)
  net.position.set(B.x0 + 6.8, s0 + (s1 - s0) / 2, zs + 0.96)
  g.add(net)

  // contact shadows on the ground (shadow catcher)
  const site = layers.building
  const catcher = new THREE.Mesh(new THREE.PlaneGeometry(240, 160), new THREE.ShadowMaterial({ opacity: 0.42 }))
  catcher.rotation.x = -Math.PI / 2
  catcher.position.set(20, 0.01, -100)
  catcher.receiveShadow = true
  site.add(catcher)

  // site: cabins, sand, bricks, branded hoarding
  const cab = [], trim = [], bricks = []
  cab.push(box(6, 2.6, 2.4, -6, 1.3, -97), box(6, 2.6, 2.4, -6, 3.9, -97.3))
  const ca = new THREE.Object3D()
  ca.position.set(-6, 4.2, -95.9)
  site.add(ca)
  anchors.attendance = ca
  trim.push(box(6.05, 0.25, 2.45, -6, 2.62, -97), box(6.05, 0.25, 2.45, -6, 5.22, -97.3))
  for (let k = 0; k < 5; k++) bricks.push(box(1.2, 0.9, 1.0, 38.5 + (k % 3) * 1.35, 0.45 + Math.floor(k / 3) * 0.9, -90.5 - (k % 2) * 1.2))
  site.add(mesh(cab, M.cabin), mesh(trim, M.cabinTrim), mesh(bricks, M.brick))
  const sand = new THREE.Mesh(new THREE.ConeGeometry(3.2, 2.1, 28), M.sand)
  sand.position.set(0.5, 1.05, -91)
  sand.castShadow = sand.receiveShadow = true
  site.add(sand)
}

// hoarding panels carry the brand (texture is supplied by the page: window.HOARDING)
export function addHoarding(img) {
  const t = new THREE.Texture(img)
  t.colorSpace = THREE.SRGBColorSpace
  t.needsUpdate = true
  t.wrapS = THREE.RepeatWrapping
  t.repeat.set(3, 1)
  const mat = new THREE.MeshStandardMaterial({ map: t, roughness: 0.7 })
  const w = 44
  const panel = new THREE.Mesh(new THREE.BoxGeometry(w, 2.4, 0.08), mat)
  panel.position.set(18, 1.2, -86.5)
  panel.castShadow = panel.receiveShadow = true
  layers.building.add(panel)
  const posts = []
  for (let x = 18 - w / 2; x <= 18 + w / 2 + 0.1; x += 3.66) posts.push(box(0.08, 2.5, 0.08, x, 1.25, -86.42))
  layers.building.add(mesh(posts, M.steel))
}

// ---------------------------------------------------------------- tower crane
{
  const g = layers.building
  const mx = 43, mz = -104, H = 50, s = 1.9
  const lat = [], dark = [], wts = [], steel = []
  const cr = [[-s / 2, -s / 2], [s / 2, -s / 2], [s / 2, s / 2], [-s / 2, s / 2]]
  for (const [a, b] of cr) lat.push(box(0.16, H, 0.16, mx + a, H / 2, mz + b))
  for (let y = 0; y < H - 0.1; y += 2) {
    for (let k = 0; k < 4; k++) {
      const [ax, az] = cr[k], [bx, bz] = cr[(k + 1) % 4]
      lat.push(beam(mx + ax, y, mz + az, mx + bx, y + 2, mz + bz, 0.08), beam(mx + ax, y + 2, mz + az, mx + bx, y + 2, mz + bz, 0.07))
    }
  }
  // slewing unit, cab, tower head
  dark.push(box(2.6, 0.9, 2.6, mx, H + 0.45, mz))
  lat.push(box(2.4, 2.3, 2.2, mx - 1.9, H + 1.7, mz + 1.4))
  const head = H + 9
  for (const [a, b] of cr) lat.push(beam(mx + a * 0.9, H + 0.9, mz + b * 0.9, mx, head, mz, 0.14))
  // jib (toward −x, over the building) as a triangular lattice
  const jy = H + 1.5, jl = 54, jt = 2.2
  const jw = 1.1
  lat.push(box(jl, 0.14, 0.14, mx - jl / 2, jy, mz - jw), box(jl, 0.14, 0.14, mx - jl / 2, jy, mz + jw), box(jl, 0.14, 0.14, mx - jl / 2, jy + jt, mz))
  for (let x = mx; x > mx - jl + 1; x -= 2.2) {
    lat.push(beam(x, jy, mz - jw, x - 1.1, jy + jt, mz, 0.07), beam(x - 1.1, jy + jt, mz, x - 2.2, jy, mz - jw, 0.07))
    lat.push(beam(x, jy, mz + jw, x - 1.1, jy + jt, mz, 0.07), beam(x - 1.1, jy + jt, mz, x - 2.2, jy, mz + jw, 0.07))
    lat.push(beam(x, jy, mz - jw, x, jy, mz + jw, 0.06))
  }
  // counter-jib with counterweights
  const cl = 17
  lat.push(box(cl, 0.2, 0.2, mx + cl / 2, jy, mz - 0.9), box(cl, 0.2, 0.2, mx + cl / 2, jy, mz + 0.9))
  for (let x = mx; x < mx + cl; x += 2.4) lat.push(beam(x, jy, mz - 0.9, x, jy, mz + 0.9, 0.08))
  for (let k = 0; k < 3; k++) wts.push(box(1.0, 2.6, 2.2, mx + cl - 1 - k * 1.1, jy - 1.2, mz))
  // pendants (tie bars) from the head
  steel.push(beam(mx, head, mz, mx - 30, jy + jt, mz, 0.07), beam(mx, head, mz, mx + cl - 1, jy + 0.2, mz, 0.07))
  // trolley on the jib; its hoist ropes, hook and a bundle of steel sections go to the 'load' layer
  // (resting at its lowest point: the page only lifts it, and clips the ropes at the trolley)
  const tx = 22, hookY = 37
  dark.push(box(1.6, 0.5, 1.8, tx, jy - 0.2, mz))
  const hook = [], load = []
  load.push(box(0.035, jy - hookY, 0.035, tx - 0.2, (jy + hookY) / 2, mz), box(0.035, jy - hookY, 0.035, tx + 0.2, (jy + hookY) / 2, mz))
  hook.push(box(0.7, 0.9, 0.5, tx, hookY - 0.2, mz))
  load.push(beam(tx, hookY - 0.6, mz, tx - 2.6, hookY - 2.6, mz, 0.03), beam(tx, hookY - 0.6, mz, tx + 2.6, hookY - 2.6, mz, 0.03))
  for (let k = 0; k < 3; k++) load.push(box(6.4, 0.32, 0.26, tx, hookY - 2.8, mz - 0.3 + k * 0.3))
  g.add(mesh(lat, M.crane), mesh(dark, M.craneDark), mesh(wts, M.weight), mesh(steel, M.steel))
  layers.load.add(mesh(hook, M.crane), mesh(load, M.steel))
  const ma = new THREE.Object3D()
  ma.position.set(tx, hookY - 2.8, mz)
  g.add(ma)
  anchors.materials = ma
  const tr = new THREE.Object3D() // underside of the trolley: where the page clips the ropes
  tr.position.set(tx, jy - 0.45, mz)
  g.add(tr)
  anchors.trolley = tr
  const base = new THREE.Mesh(new THREE.BoxGeometry(6, 1, 6), M.concreteDark)
  base.position.set(mx, 0.5, mz)
  base.receiveShadow = true
  g.add(base)
}

// ---------------------------------------------------------------- far layer: field, treeline, city, hills
{
  const g = layers.far
  const groundTex = noiseTexture(512, [196, 176, 128], 26)
  groundTex.repeat.set(160, 160)
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(9000, 9000), new THREE.MeshStandardMaterial({ color: '#cbb68a', map: groundTex, roughness: 1 }))
  ground.rotation.x = -Math.PI / 2
  ground.position.set(0, -0.02, -4580)
  ground.receiveShadow = true
  g.add(ground)

  // treeline: canopies built from many small leaf clusters, darker underneath
  const canopy = [], trunks = []
  const leafA = new THREE.Color('#5f6a3b'), leafB = new THREE.Color('#8a8d55'), under = new THREE.Color('#3f4526')
  for (let i = 0; i < 260; i++) {
    const x = rand(-620, 620), z = rand(-230, -760), s = rand(4.5, 10)
    if (x > -4 && x < 52 && z > -150) continue
    trunks.push(box(0.45, s * 0.9, 0.45, x, s * 0.45, z))
    const cy = s * 1.15, n = 12 + Math.floor(R() * 10)
    for (let k = 0; k < n; k++) {
      const c = new THREE.IcosahedronGeometry(s * rand(0.24, 0.44), 2)
      const cp = c.attributes.position
      for (let v = 0; v < cp.count; v++) {
        const vx = cp.getX(v), vy = cp.getY(v), vz = cp.getZ(v)
        const d = 1 + (vnoise(vx * 0.9 + i, vy * 0.9 + k) - 0.5) * 0.55
        cp.setXYZ(v, vx * d, vy * d * 0.9, vz * d)
      }
      c.computeVertexNormals()
      const px = rand(-0.75, 0.75) * s, py = rand(-0.45, 0.55) * s, pz = rand(-0.6, 0.6) * s
      c.translate(x + px, cy + py, z + pz)
      const col = new Float32Array(c.attributes.position.count * 3)
      const tone = leafA.clone().lerp(leafB, R())
      for (let v = 0; v < c.attributes.position.count; v++) {
        const up = (c.attributes.position.getY(v) - (cy - s * 0.6)) / (s * 1.4)
        const cc = under.clone().lerp(tone, THREE.MathUtils.clamp(up + 0.25, 0, 1))
        col.set([cc.r, cc.g, cc.b], v * 3)
      }
      c.setAttribute('color', new THREE.BufferAttribute(col, 3))
      canopy.push(c)
    }
  }
  g.add(mesh(canopy, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1 }), { cast: false }))
  g.add(mesh(trunks, new THREE.MeshStandardMaterial({ color: '#4d4033', roughness: 1 }), { cast: false }))

  // distant city with a few tower cranes
  const city = [], cranes = []
  for (let i = 0; i < 150; i++) {
    const x = rand(-1500, 1500), z = rand(-1500, -2700)
    const h = rand(18, 70) * (R() > 0.85 ? 2.1 : 1)
    const w = rand(25, 70)
    city.push(box(w, h, rand(25, 60), x, h / 2, z))
  }
  for (const [x, z] of [[-620, -1300], [380, -1500], [940, -1250]]) {
    cranes.push(box(4, 120, 4, x, 60, z), box(150, 3, 3, x - 50, 118, z), box(40, 5, 5, x + 18, 116, z))
  }
  const tones = ['#cbc2b4', '#b7ad9e', '#d8d0c4'].map(c => new THREE.MeshStandardMaterial({ color: c, roughness: 0.9 }))
  const byTone = [[], [], []]
  city.forEach((c, i) => byTone[i % 3].push(c))
  byTone.forEach((list, i) => g.add(mesh(list, tones[i], { cast: false })))
  g.add(mesh(cranes, new THREE.MeshStandardMaterial({ color: '#b8a58a', roughness: 0.9 }), { cast: false }))

  // hills
  const hills = new THREE.PlaneGeometry(9000, 3200, 360, 128)
  hills.rotateX(-Math.PI / 2)
  const p = hills.attributes.position
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), z = p.getZ(i)
    const ridge = Math.max(0, fbm(x / 900 + 3.1, z / 700 + 1.7) - 0.28) * 520
    p.setY(i, ridge * THREE.MathUtils.smoothstep(z, -1500, 600))
  }
  hills.computeVertexNormals()
  const hm = new THREE.Mesh(hills, new THREE.MeshStandardMaterial({ color: '#8e8a6c', roughness: 1 }))
  hm.position.set(0, 0, -4300)
  g.add(hm)
}

// ---------------------------------------------------------------- grass layer: ground + instanced blades
{
  const g = layers.grass
  const soilTex = noiseTexture(512, [120, 104, 70], 30)
  soilTex.repeat.set(40, 40)
  const soil = new THREE.Mesh(new THREE.PlaneGeometry(260, 96), new THREE.MeshStandardMaterial({ color: '#8f7a52', map: soilTex, roughness: 1 }))
  soil.rotation.x = -Math.PI / 2
  soil.position.set(20, 0, -44)
  soil.receiveShadow = true
  g.add(soil)

  // one blade: 5 segments, tapered; t (0..1) along the height in uv.y
  const SEG = 5
  const pos = [], uv = [], idx = []
  for (let s = 0; s <= SEG; s++) {
    const t = s / SEG
    pos.push(-0.5, t, 0, 0.5, t, 0)
    uv.push(0, t, 1, t)
    if (s < SEG) {
      const a = s * 2
      idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2)
    }
  }
  const blade = new THREE.InstancedBufferGeometry()
  blade.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  blade.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2))
  blade.setIndex(idx)

  // zones: [zNear, zFar, xMin, xMax, count]
  const zones = [
    [-1.0, -7, -10, 9, 70000],
    [-7, -26, -32, 28, 110000],
    [-26, -91.5, -112, 88, 160000],
  ]
  const N = zones.reduce((s, z) => s + z[4], 0)
  const off = new Float32Array(N * 3), shape = new Float32Array(N * 4), tint = new Float32Array(N * 3)
  let n = 0
  for (const [z0, z1, x0, x1, count] of zones) {
    let cxz = [0, 0], left = 0
    for (let i = 0; i < count; i++, n++) {
      if (left-- <= 0) {
        // start a new tuft
        cxz = [rand(x0, x1), z0 + (z1 - z0) * Math.pow(R(), 0.9)]
        left = 6 + Math.floor(R() * 26)
      }
      const spread = 0.12 + Math.abs(cxz[1]) * 0.006
      off[n * 3] = cxz[0] + rand(-spread, spread) * 2.2
      off[n * 3 + 1] = 0
      off[n * 3 + 2] = cxz[1] + rand(-spread, spread)
      const tall = R() > 0.93 ? 1.45 : 1
      shape[n * 4] = rand(0.32, 0.95) * tall // height
      shape[n * 4 + 1] = rand(0.011, 0.02) // width
      shape[n * 4 + 2] = R() * Math.PI * 2 // facing
      shape[n * 4 + 3] = rand(0.08, 0.55) // bend
      const k = R()
      // dry straw / olive / a few greener blades
      const c = k < 0.42 ? [0.84, 0.69, 0.4] : k < 0.72 ? [0.72, 0.6, 0.33] : k < 0.9 ? [0.55, 0.53, 0.29] : [0.44, 0.5, 0.26]
      const v = rand(0.78, 1.1)
      tint[n * 3] = c[0] * v
      tint[n * 3 + 1] = c[1] * v
      tint[n * 3 + 2] = c[2] * v
    }
  }
  blade.setAttribute('offset', new THREE.InstancedBufferAttribute(off, 3))
  blade.setAttribute('shape', new THREE.InstancedBufferAttribute(shape, 4))
  blade.setAttribute('tint', new THREE.InstancedBufferAttribute(tint, 3))
  blade.instanceCount = N

  const uniforms = {
    sunDir: { value: SUN_DIR.clone() },
    sunColor: { value: new THREE.Color('#ffd09c').multiplyScalar(2.6) },
    skyColor: { value: new THREE.Color('#cfe0ea').multiplyScalar(0.85) },
    groundColor: { value: new THREE.Color('#9c8156').multiplyScalar(0.7) },
    fogColor: { value: FOG.clone() },
    fogDensity: { value: 0.0006 },
  }
  const mat = new THREE.ShaderMaterial({
    uniforms,
    side: THREE.DoubleSide,
    vertexShader: /* glsl */ `
      attribute vec3 offset; attribute vec4 shape; attribute vec3 tint;
      varying float vT; varying vec3 vTint; varying vec3 vN; varying vec3 vWorld;
      void main() {
        float t = uv.y;
        float h = shape.x, w = shape.y, a = shape.z, bend = shape.w;
        vec2 dir = vec2(cos(a), sin(a));
        vec2 lean = normalize(vec2(0.8, 0.25) + dir * 0.6);
        float taper = pow(1.0 - t, 0.75);
        vec3 p = vec3(dir.y * (uv.x - 0.5) * w * taper * 2.0, t * h, -dir.x * (uv.x - 0.5) * w * taper * 2.0);
        p.xz += lean * bend * h * t * t;
        p.y -= bend * bend * h * t * t * 0.35;
        vec3 world = offset + p;
        vWorld = world; vT = t; vTint = tint;
        vN = normalize(vec3(dir.x, 0.35 + t * 0.4, dir.y));
        gl_Position = projectionMatrix * viewMatrix * vec4(world, 1.0);
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 sunDir; uniform vec3 sunColor; uniform vec3 skyColor; uniform vec3 groundColor;
      uniform vec3 fogColor; uniform float fogDensity;
      varying float vT; varying vec3 vTint; varying vec3 vN; varying vec3 vWorld;
      void main() {
        vec3 V = normalize(cameraPosition - vWorld);
        vec3 N = normalize(vN);
        if (dot(N, V) < 0.0) N = -N;
        vec3 base = vTint * mix(0.32, 1.0, pow(vT, 0.8));
        base = mix(base, base * vec3(1.08, 1.02, 0.86), smoothstep(0.7, 1.0, vT));
        float ao = mix(0.22, 1.0, smoothstep(0.0, 0.8, vT));
        float diff = max(dot(N, sunDir), 0.0) * 0.75 + 0.25;
        vec3 amb = mix(groundColor, skyColor, 0.5 + 0.5 * N.y);
        float trans = pow(max(dot(-V, sunDir), 0.0), 3.0) * vT;
        vec3 col = base * (amb + sunColor * diff * 0.55) * ao + base * sunColor * trans * 0.5;
        float d = length(cameraPosition - vWorld);
        float fog = 1.0 - exp(-pow(fogDensity * d, 2.0));
        col = mix(col, fogColor, fog);
        gl_FragColor = vec4(col, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  })
  const grass = new THREE.Mesh(blade, mat)
  grass.frustumCulled = false
  g.add(grass)

  // seed heads on some blades
  const heads = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 6, 4), new THREE.MeshStandardMaterial({ color: '#cfb57d', roughness: 0.9 }), 14000)
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), sc = new THREE.Vector3(), ps = new THREE.Vector3()
  let hc = 0
  for (let i = 0; i < N && hc < 14000; i += 17) {
    const h = shape[i * 4], bend = shape[i * 4 + 3], a = shape[i * 4 + 2]
    const lx = 0.8 + Math.cos(a) * 0.6, lz = 0.25 + Math.sin(a) * 0.6, ll = Math.hypot(lx, lz)
    ps.set(off[i * 3] + (lx / ll) * bend * h, h - bend * bend * h * 0.35, off[i * 3 + 2] + (lz / ll) * bend * h)
    q.setFromEuler(new THREE.Euler(rand(-0.5, 0.5), 0, rand(-0.5, 0.5)))
    sc.set(0.009, 0.042, 0.009)
    heads.setMatrixAt(hc++, m4.compose(ps, q, sc))
  }
  heads.count = hc
  heads.frustumCulled = false
  g.add(heads)
}

// ---------------------------------------------------------------- cameras + layer rendering
const FRAMINGS = {
  // desktop 16:10 — building right of centre, horizon low (like a ground-level architectural shot)
  // (2.2:1 so wide/short screens never crop the building; the page anchors this frame to the right edge)
  desktop: { aspect: 2.2, fov: 38, pos: [0, 1.45, 0], yaw: 12, pitch: 10.6 },
  // mobile portrait — turned towards the building so it sits centred
  mobile: { aspect: 0.62, fov: 52.7, pos: [8, 1.45, -6], yaw: -9.5, pitch: 18.8 },
}

export function render(layer, framing, width, height) {
  const f = FRAMINGS[framing]
  const cam = new THREE.PerspectiveCamera(f.fov, width / height, 0.3, 12000)
  cam.position.set(...f.pos)
  cam.rotation.order = 'YXZ'
  cam.rotation.y = THREE.MathUtils.degToRad(f.yaw)
  cam.rotation.x = THREE.MathUtils.degToRad(f.pitch)
  renderer.setSize(width, height, false)
  for (const [k, gr] of Object.entries(layers)) gr.visible = k === layer
  renderer.render(scene, cam)
  return renderer.domElement.toDataURL('image/png')
}

// project the hotspot anchors to [0..1] screen coordinates for a framing (used to place the page hotspots)
export function project(framing) {
  const f = FRAMINGS[framing]
  const cam = new THREE.PerspectiveCamera(f.fov, f.aspect, 0.3, 12000)
  cam.position.set(...f.pos)
  cam.rotation.order = 'YXZ'
  cam.rotation.y = THREE.MathUtils.degToRad(f.yaw)
  cam.rotation.x = THREE.MathUtils.degToRad(f.pitch)
  cam.updateMatrixWorld()
  scene.updateMatrixWorld(true)
  const out = {}
  for (const [k, o] of Object.entries({ ...anchors, ...framingAnchors[framing] })) {
    const v = o.getWorldPosition(new THREE.Vector3()).project(cam)
    out[k] = [+((v.x + 1) / 2).toFixed(4), +((1 - v.y) / 2).toFixed(4)]
  }
  return out
}
