const assert = require('node:assert/strict');
const { readFileSync, existsSync } = require('node:fs');
const { resolve } = require('node:path');
const { parseEnv } = require('node:util');
const { spawnSync } = require('node:child_process');
const root = resolve(__dirname, '..');
const values = parseEnv(readFileSync(resolve(root, '.env'), 'utf8'));
for (const key of ['DATABASE_URL', 'JWT_SECRET', 'JWT_REFRESH_SECRET']) {
  assert.ok(values[key], `Missing root ${key}`);
}
for (const file of ['apps/api/.env', 'apps/web/.env.local', 'apps/website/.env.local', 'apps/mobile/.env', 'apps/mobile/.env.development.local']) {
  assert.equal(existsSync(resolve(root, file)), false, `Conflicting override: ${file}`);
}
const checks = {
  web: `assert.equal(process.env.NEXT_PUBLIC_API_URL, values.NEXT_PUBLIC_API_URL); assert.equal(process.env.PORT, undefined); assert.equal(process.env.JWT_SECRET, undefined);`,
  website: `assert.equal(process.env.SMTP_PASS, undefined); assert.equal(process.env.WEBSITE_ENQUIRY_INGEST_KEY, undefined); assert.equal(process.env.API_BASE_URL, values.API_BASE_URL); assert.equal(process.env.JWT_SECRET, undefined);`,
  mobile: `assert.equal(process.env.EXPO_PUBLIC_API_BASE_URL, values.EXPO_PUBLIC_API_BASE_URL); assert.equal(process.env.AWS_SECRET_ACCESS_KEY, undefined); assert.equal(process.env.WEBSITE_SMTP_PASS, undefined);`,
};
for (const [app, check] of Object.entries(checks)) {
  const env = { ...process.env };
  for (const key of Object.keys(values)) delete env[key];
  for (const key of ['SMTP_HOST', 'SMTP_PASS', 'PORT', 'JWT_SECRET', 'AWS_SECRET_ACCESS_KEY']) delete env[key];
  const script = `const assert=require('node:assert/strict'); const {parseEnv}=require('node:util'); const values=parseEnv(require('node:fs').readFileSync('../../.env','utf8')); ${check}`;
  const result = spawnSync(process.execPath, ['--require', '../../scripts/load-root-env.cjs', '-e', script], { cwd: resolve(root, 'apps', app), env, encoding: 'utf8' });
  // Assertions can contain values: report only the failing app, never stderr/secrets.
  assert.equal(result.status, 0, `${app}: root environment loading failed`);
  const precedence = spawnSync(process.execPath, ['--require', '../../scripts/load-root-env.cjs', '-e', `if(process.env.${app === 'web' ? 'NEXT_PUBLIC_API_URL' : app === 'website' ? 'API_BASE_URL' : 'EXPO_PUBLIC_API_BASE_URL'} !== 'injected-value') process.exit(1)`], {
    cwd: resolve(root, 'apps', app), env: { ...env, [app === 'web' ? 'NEXT_PUBLIC_API_URL' : app === 'website' ? 'API_BASE_URL' : 'EXPO_PUBLIC_API_BASE_URL']: 'injected-value' },
  });
  assert.equal(precedence.status, 0, `${app}: injected environment must take precedence`);
}
console.log('Root env checks passed: Web/Website/Mobile loading, secret isolation and process precedence. No network or database access.');
