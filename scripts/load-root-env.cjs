// Preload before Next/Expo so their public-variable transforms see root values.
// Only the selected app's configuration is injected; server secrets stay server-side.
const { existsSync, readFileSync } = require('node:fs');
const { resolve, basename } = require('node:path');
const { parseEnv } = require('node:util');

const rootFile = resolve(__dirname, '../.env');
const values = existsSync(rootFile) ? parseEnv(readFileSync(rootFile, 'utf8')) : {};
const app = basename(process.cwd());
const keys = {
  web: ['NEXT_PUBLIC_API_URL', 'NEXT_PUBLIC_API_BASE_PATH'],
  website: ['API_BASE_URL', 'NEXT_PUBLIC_SITE_URL', 'SITE_INDEXING_ENABLED'],
  mobile: Object.keys(values).filter(key => key.startsWith('EXPO_PUBLIC_')),
}[app];
if (!keys) throw new Error('Run the app package command from apps/web, apps/website or apps/mobile.');
for (const key of keys) {
  if (process.env[key] === undefined && values[key] !== undefined) process.env[key] = values[key];
}
