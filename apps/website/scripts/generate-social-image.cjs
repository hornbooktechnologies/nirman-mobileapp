// Deterministic brand artwork, using the existing logo and Next.js's Sharp dependency.
const fs = require('node:fs')
const path = require('node:path')
const sharp = require('sharp')

async function main() {
  const root = path.resolve(__dirname, '..')
  const artwork = Buffer.from(`<svg width="1200" height="630" xmlns="http://www.w3.org/2000/svg">
    <rect width="1200" height="630" fill="#f7f5ef"/>
    <rect x="0" y="610" width="1200" height="20" fill="#555e3d"/>
    <circle cx="1120" cy="530" r="240" fill="#555e3d" opacity="0.07"/>
    <path d="M930 610V350H1090V610M970 350V270H1050V350M920 420H1100M920 490H1100M920 560H1100" stroke="#555e3d" stroke-width="3" fill="none" opacity="0.18"/>
    <g font-family="Arial, sans-serif">
      <text x="72" y="240" font-size="55" font-weight="700" fill="#2a211b">Construction management</text>
      <text x="72" y="310" font-size="55" font-weight="700" fill="#a35524">for builders &amp; contractors.</text>
      <text x="72" y="390" font-size="27" fill="#51483f">Attendance. Wages. Expenses. Materials. Progress.</text>
      <text x="72" y="434" font-size="27" fill="#51483f">Your site and office, connected on mobile and web.</text>
      <text x="72" y="552" font-size="24" fill="#555e3d">nirmansite.com</text>
    </g>
  </svg>`)
  const logo = await sharp(path.join(root, 'src/assets/brand/horizontal-logo.png')).resize({ width: 310 }).png().toBuffer()
  const destination = path.join(root, 'public/media/nirmansite-social.png')
  await sharp(artwork).composite([{ input: logo, left: 72, top: 62 }]).png().toFile(destination)
  console.log('Created public/media/nirmansite-social.png (1200 × 630)')
}
main().catch(error => { console.error(error.message); process.exitCode = 1 })
