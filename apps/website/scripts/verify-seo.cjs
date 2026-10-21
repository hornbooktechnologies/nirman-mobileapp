const assert = require('node:assert/strict')

const base = process.env.SEO_BASE_URL || 'http://localhost:3000'
const indexable = process.env.SEO_EXPECT_INDEXING === 'true'
const canonical = 'https://nirmansite.com'

function meta(html, name, property = 'name') {
  const tags = html.match(/<meta\b[^>]*>/g) || []
  const tag = tags.find(value => value.includes(`${property}="${name}"`))
  return tag?.match(/content="([^"]*)"/)?.[1]
}

async function read(path) {
  const response = await fetch(`${base}${path}`)
  assert.equal(response.status, 200, `${path} must return 200`)
  return { response, html: await response.text() }
}

async function main() {
  const fs = require('node:fs')
  const path = require('node:path')
  const { transformSync } = require('esbuild')
  const source = fs.readFileSync(path.join(__dirname, '../src/config/seo.ts'), 'utf8')
  const code = transformSync(source, { loader: 'ts', format: 'esm' }).code
  const { isSearchIndexingEnabled } = await import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`)
  const live = { NODE_ENV: 'production', VERCEL_ENV: 'production', NEXT_PUBLIC_SITE_URL: canonical, SITE_INDEXING_ENABLED: 'true' }
  assert.equal(isSearchIndexingEnabled(live), true)
  for (const override of [
    { SITE_INDEXING_ENABLED: undefined }, { SITE_INDEXING_ENABLED: 'false' },
    { NODE_ENV: 'development' }, { VERCEL_ENV: 'preview' }, { VERCEL_ENV: 'development' },
    { NEXT_PUBLIC_SITE_URL: 'https://nirman-website.vercel.app' },
    { NEXT_PUBLIC_SITE_URL: 'https://nirmansite.com.example.com' },
    { NEXT_PUBLIC_SITE_URL: 'https://nirmansite.com/staging' }, { NEXT_PUBLIC_SITE_URL: 'invalid' },
  ]) assert.equal(isSearchIndexingEnabled({ ...live, ...override }), false, `Indexing guard: ${JSON.stringify(override)}`)
  const titles = new Set()
  for (const path of ['/', '/about', '/contact']) {
    const { response, html } = await read(path)
    const title = html.match(/<title>(.*?)<\/title>/)?.[1]
    assert.ok(title?.includes('NirmanSite'), `${path} title`)
    assert.ok(!titles.has(title), `${path} distinct title`)
    titles.add(title)
    assert.ok(meta(html, 'description')?.length > 50, `${path} description`)
    const canonicalUrl = html.match(/<link rel="canonical" href="([^"]+)"/)?.[1]
    assert.equal(new URL(canonicalUrl).href, new URL(`${canonical}${path}`).href, `${path} canonical`)
    assert.equal(new URL(meta(html, 'og:url', 'property')).href, new URL(`${canonical}${path}`).href)
    assert.ok(meta(html, 'og:image', 'property')?.endsWith('/media/nirmansite-social.png'))
    assert.equal(meta(html, 'twitter:card'), 'summary_large_image')
    assert.equal(meta(html, 'robots')?.includes('noindex'), !indexable, `${path} robots meta`)
    assert.equal(Boolean(response.headers.get('x-robots-tag')?.includes('noindex')), !indexable, `${path} robots header`)
    if (path === '/') {
      assert.equal((html.match(/<h1\b/g) || []).length, 1, 'One homepage h1')
      assert.ok(html.includes('construction management app for Indian builders and contractors'))
      assert.ok(html.includes('Labour attendance, Kharchi and wages.'))
      assert.ok(html.includes('Material requests and construction progress.'))
      assert.ok(html.includes('How are attendance and wages connected?'))
      assert.ok((html.match(/<details\b/g) || []).length >= 10, 'FAQ rendered without JavaScript')
      const json = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)?.[1]
      assert.ok(json, 'JSON-LD present in HTML')
      const graph = JSON.parse(json)['@graph']
      assert.deepEqual(graph.map(item => item['@type']), ['Organization', 'WebSite', 'SoftwareApplication'])
      assert.ok(!json.includes('aggregateRating') && !json.includes('offers'), 'No invented commercial proof')
    }
  }
  for (const path of ['/activate', '/hero-preview', '/privacy', '/terms']) {
    const { html } = await read(path)
    assert.ok(meta(html, 'robots')?.includes('noindex'), `${path} remains excluded`)
  }
  const { html: robots } = await read('/robots.txt')
  assert.ok(robots.includes('User-Agent: *') && robots.includes('Allow: /'))
  assert.ok(robots.includes('Disallow: /api/'))
  assert.equal(robots.includes('User-Agent: OAI-SearchBot\nDisallow: /'), !indexable)
  if (indexable) {
    for (const path of ['/activate', '/hero-preview', '/privacy', '/terms']) assert.ok(robots.includes(`Disallow: ${path}`), `AI crawler excludes ${path}`)
  }
  assert.equal(robots.includes(`Sitemap: ${canonical}/sitemap.xml`), indexable)
  const { html: sitemap } = await read('/sitemap.xml')
  const locations = [...sitemap.matchAll(/<loc>(.*?)<\/loc>/g)].map(match => match[1])
  assert.deepEqual(locations, indexable ? [`${canonical}/`, `${canonical}/about`, `${canonical}/contact`] : [])
  const image = await fetch(`${base}/media/nirmansite-social.png`)
  assert.equal(image.status, 200)
  const png = Buffer.from(await image.arrayBuffer())
  assert.equal(png.subarray(1, 4).toString(), 'PNG')
  assert.equal(png.readUInt32BE(16), 1200)
  assert.equal(png.readUInt32BE(20), 630)
  console.log(`SEO verification passed: ${indexable ? 'live' : 'staging'} metadata, HTML content, JSON-LD, exclusions, robots, sitemap and sharing image.`)
}
main().catch(error => { console.error(error.message); process.exitCode = 1 })
