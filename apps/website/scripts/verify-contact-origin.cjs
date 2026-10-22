const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const { transformSync } = require('esbuild')

async function main() {
  const source = fs.readFileSync(path.join(__dirname, '../src/lib/contact/request-origin.ts'), 'utf8')
  const code = transformSync(source, { loader: 'ts', format: 'esm' }).code
  const { isAllowedContactOrigin } = await import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`)

  assert.equal(
    isAllowedContactOrigin(
      'http://website:3000/api/contact',
      'https://nirmansite.com',
      'https://nirmansite.com',
    ),
    true,
    'The configured public origin must work behind the internal reverse proxy URL',
  )
  assert.equal(
    isAllowedContactOrigin('http://localhost:3001/api/contact', 'http://localhost:3001', undefined),
    true,
    'Same-origin local development must continue to work',
  )

  for (const origin of [
    null,
    'null',
    'https://nirmansite.com.evil.example',
    'https://nirmansite.com/path',
    'https://evil.example',
  ]) {
    assert.equal(
      isAllowedContactOrigin('http://website:3000/api/contact', origin, 'https://nirmansite.com'),
      false,
      `Unexpected origin accepted: ${origin}`,
    )
  }

  console.log('Contact origin verification passed: public proxy origin, local same-origin, and rejection cases.')
}

main().catch(error => {
  console.error(error.message)
  process.exitCode = 1
})
