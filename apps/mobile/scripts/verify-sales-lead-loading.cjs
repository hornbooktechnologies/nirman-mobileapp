// Exercise the screen's actual loading hooks without a device or network.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

const source = fs.readFileSync(path.join(__dirname, '../src/features/sales/sales-lead-screen.tsx'), 'utf8');
const start = source.indexOf('export function SalesLeadScreen()');
const end = source.indexOf('  const callableNumber', start);
assert.ok(start >= 0 && end > start);
const hooks = source.slice(start, end) + 'return { loading, refreshing, error, load, setSummary }; }';
const slots = [];
let cursor = 0;
let pending = [];
let dirty = false;
let leadId = 'lead-1';
let session = { activeOrganization: { id: 'org-1' }, activeProjectId: 'project-1', accessToken: 'token-1' };
let fail = false;
const calls = [];
const t = (key) => key;
const same = (a, b) => a && a.length === b.length && a.every((value, i) => Object.is(value, b[i]));
const memo = (factory, deps) => {
  const index = cursor++;
  if (!slots[index] || !same(slots[index].deps, deps)) slots[index] = { deps, value: factory() };
  return slots[index].value;
};
const exportsObject = {};
vm.runInNewContext(ts.transpileModule(hooks, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, {
  exports: exportsObject,
  useLocalSearchParams: () => ({ leadId }),
  useTranslation: () => ({ t, i18n: { resolvedLanguage: 'en' } }),
  useSession: () => ({ session }),
  // Match getActiveProject's normalization: fresh object on every render.
  getActiveProject: () => ({ id: session.activeProjectId }),
  getActiveProjectPermissions: () => [],
  formatDateOnly: () => '2026-09-23',
  getLocalizedErrorMessage: (_cause, fallback) => fallback,
  useState: (initial) => {
    const index = cursor++;
    if (!(index in slots)) slots[index] = initial;
    return [slots[index], (value) => {
      if (!Object.is(slots[index], value)) { slots[index] = value; dirty = true; }
    }];
  },
  useCallback: (callback, deps) => memo(() => callback, deps),
  useEffect: (effect, deps) => memo(() => { pending.push(effect); }, deps),
  fetchLead: async (...args) => { calls.push(['lead', ...args]); if (fail) throw Error('offline'); return { id: leadId }; },
  fetchActivities: async (...args) => { calls.push(['activities', ...args]); return []; },
});
function render() {
  cursor = 0;
  dirty = false;
  const state = exportsObject.SalesLeadScreen();
  const effects = pending;
  pending = [];
  effects.forEach((effect) => effect());
  return state;
}
async function settle() {
  for (let i = 0; i < 12; i++) {
    const state = render();
    await new Promise((resolve) => setImmediate(resolve));
    if (!dirty) return state;
  }
  assert.fail('Lead loading did not settle: repeated fetch/render loop');
}
(async () => {
  let state = await settle();
  assert.equal(calls.length, 2);
  assert.equal(state.loading, false);
  state.setSummary('Editing a timeline note');
  session = { ...session, activeOrganization: { ...session.activeOrganization } };
  state = await settle();
  assert.equal(calls.length, 2, 'local edits and equivalent session objects must not refetch');
  await state.load(true);
  state = await settle();
  assert.equal(calls.length, 4);
  assert.equal(state.refreshing, false);
  for (const change of [() => { leadId = 'lead-2'; }, () => { session.activeProjectId = 'project-2'; }, () => { session.activeOrganization.id = 'org-2'; }, () => { session.accessToken = 'token-2'; }]) {
    const before = calls.length;
    change();
    state = await settle();
    assert.equal(calls.length, before + 2, 'request identity changes must reload once');
    assert.deepEqual(calls.at(-2), ['lead', session.activeOrganization.id, session.activeProjectId, leadId, session.accessToken]);
  }
  fail = true;
  await state.load(true);
  state = await settle();
  const failedCount = calls.length;
  assert.equal(state.loading, false);
  assert.equal(state.refreshing, false);
  assert.equal(state.error, 'errors.load');
  await settle();
  assert.equal(calls.length, failedCount, 'errors must not create a retry loop');
  fail = false;
  await state.load(true);
  state = await settle();
  assert.equal(state.error, null);
  console.log('PASS: initial load settles; edits/session rerenders stay idle; refresh, identity changes, failure and recovery work.');
})().catch((error) => { console.error(error); process.exitCode = 1; });
