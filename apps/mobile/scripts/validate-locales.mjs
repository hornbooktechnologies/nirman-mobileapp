import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const appRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const localeRoot = join(appRoot, 'src', 'i18n', 'locales');
const languages = ['en', 'hi', 'gu'];
const namespaces = ['common', 'auth', 'navigation', 'errors', 'home', 'projects', 'team', 'members', 'workers', 'attendance', 'calendar'];

function flatten(value, prefix = '') {
  return Object.entries(value).flatMap(([key, child]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    return child && typeof child === 'object' && !Array.isArray(child)
      ? flatten(child, path)
      : [[path, child]];
  });
}

function placeholders(value) {
  if (typeof value !== 'string') return [];
  return [...value.matchAll(/{{\s*([^},\s]+)[^}]*}}/g)]
    .map((match) => match[1])
    .sort();
}

const failures = [];

for (const namespace of namespaces) {
  const localeEntries = {};

  for (const language of languages) {
    const file = join(localeRoot, language, `${namespace}.json`);
    const parsed = JSON.parse(await readFile(file, 'utf8'));
    localeEntries[language] = new Map(flatten(parsed));
  }

  const canonicalKeys = [...localeEntries.en.keys()].sort();

  for (const language of languages.slice(1)) {
    const translatedKeys = [...localeEntries[language].keys()].sort();
    const missing = canonicalKeys.filter((key) => !localeEntries[language].has(key));
    const extra = translatedKeys.filter((key) => !localeEntries.en.has(key));

    if (missing.length) failures.push(`${language}/${namespace}: missing ${missing.join(', ')}`);
    if (extra.length) failures.push(`${language}/${namespace}: extra ${extra.join(', ')}`);

    for (const key of canonicalKeys) {
      if (!localeEntries[language].has(key)) continue;
      const expected = placeholders(localeEntries.en.get(key));
      const actual = placeholders(localeEntries[language].get(key));
      if (expected.join('|') !== actual.join('|')) {
        failures.push(`${language}/${namespace}:${key}: placeholders ${actual.join(', ')} != ${expected.join(', ')}`);
      }
    }
  }

  for (const key of canonicalKeys.filter((candidate) => candidate.endsWith('_one'))) {
    const otherKey = key.replace(/_one$/, '_other');
    if (!localeEntries.en.has(otherKey)) failures.push(`en/${namespace}:${key}: missing plural pair ${otherKey}`);
  }
}

if (failures.length) {
  console.error(failures.join('\n'));
  process.exitCode = 1;
} else {
  console.log(`Validated ${namespaces.length} namespaces across ${languages.length} languages: keys and placeholders match.`);
}
