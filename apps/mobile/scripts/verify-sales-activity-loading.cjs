const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

const source = fs.readFileSync(path.join(__dirname, '../src/features/sales/sales-activity-screen.tsx'), 'utf8');
const start = source.indexOf('export function SalesActivityScreen()');
const end = source.indexOf('  if (!leadId || !project || !session?.activeOrganization)', start);
assert.ok(start >= 0 && end > start);
const hooks = source.slice(start, end) + 'return { loading, refreshing, error, activities, load }; }';

const slots = [];
let cursor = 0;
let effects = [];
let dirty = false;
const calls = [];
const exportsObject = {};
const t = (key) => key;
const session = { activeOrganization: { id: 'org-1' }, activeProjectId: 'project-1', accessToken: 'token-1' };
const same = (a, b) => a && a.length === b.length && a.every((value, index) => Object.is(value, b[index]));
const memo = (factory, deps) => {
  const index = cursor++;
  if (!slots[index] || !same(slots[index].deps, deps)) slots[index] = { deps, value: factory() };
  return slots[index].value;
};

vm.runInNewContext(ts.transpileModule(hooks, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, {
  exports: exportsObject,
  useLocalSearchParams: () => ({ leadId: 'lead-1' }),
  useTranslation: () => ({ t }),
  useSession: () => ({ session }),
  getActiveProject: () => ({ id: session.activeProjectId }),
  getLocalizedErrorMessage: (_cause, fallback) => fallback,
  useState: (initial) => {
    const index = cursor++;
    if (!(index in slots)) slots[index] = initial;
    return [slots[index], (value) => {
      const next = typeof value === 'function' ? value(slots[index]) : value;
      if (!Object.is(slots[index], next)) { slots[index] = next; dirty = true; }
    }];
  },
  useCallback: (callback, deps) => memo(() => callback, deps),
  useEffect: (effect, deps) => {
    const index = cursor++;
    if (!slots[index] || !same(slots[index].deps, deps)) {
      slots[index] = { deps };
      effects.push(effect);
    }
  },
  fetchLead: async (...args) => { calls.push(['lead', ...args]); return { id: 'lead-1', customerName: 'Customer' }; },
  fetchActivities: async (...args) => { calls.push(['activities', ...args]); return [{ id: 'activity-1' }]; },
});

function render() {
  cursor = 0;
  dirty = false;
  const state = exportsObject.SalesActivityScreen();
  const pending = effects;
  effects = [];
  pending.forEach((effect) => effect());
  return state;
}

async function settle() {
  for (let attempt = 0; attempt < 12; attempt += 1) {
    const state = render();
    await new Promise((resolve) => setImmediate(resolve));
    if (!dirty) return state;
  }
  assert.fail('Activity loading did not settle');
}

(async () => {
  let state = await settle();
  assert.equal(state.loading, false);
  assert.equal(state.activities.length, 1);
  assert.equal(calls.length, 2, 'initial render must fetch lead and activities once');

  state = await settle();
  assert.equal(calls.length, 2, 'data updates and equivalent project objects must not refetch');

  await state.load(true);
  state = await settle();
  assert.equal(state.refreshing, false);
  assert.equal(calls.length, 4, 'manual refresh must still fetch once');
  console.log('PASS: activity screen load settles; rerenders stay idle and manual refresh remains available.');
})().catch((error) => { console.error(error); process.exitCode = 1; });
