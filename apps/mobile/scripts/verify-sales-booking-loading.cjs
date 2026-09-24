const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

const source = fs.readFileSync(path.join(__dirname, '../src/features/sales/sales-booking-screen.tsx'), 'utf8');
const start = source.indexOf('export function SalesBookingScreen()');
const end = source.indexOf('  function openCancellation()', start);
assert.ok(start >= 0 && end > start);
const hooks = source.slice(start, end) + 'return { booking, loading, refreshing, error, load }; }';

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
  useLocalSearchParams: () => ({ bookingId: 'booking-1' }),
  useTranslation: () => ({ t, i18n: { resolvedLanguage: 'en' } }),
  useSession: () => ({ session }),
  getActiveProject: () => ({ id: session.activeProjectId }),
  getActiveProjectPermissions: () => [],
  getLocalizedErrorMessage: (_cause, fallback) => fallback,
  useRef: (initial) => {
    const index = cursor++;
    if (!(index in slots)) slots[index] = { current: initial };
    return slots[index];
  },
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
      slots[index]?.cleanup?.();
      slots[index] = { deps };
      effects.push(() => { slots[index].cleanup = effect(); });
    }
  },
  fetchBooking: async (...args) => { calls.push(args); return { id: 'booking-1', status: 'CONFIRMED' }; },
  LEAD_STAGES: [],
});

function render() {
  cursor = 0;
  dirty = false;
  const state = exportsObject.SalesBookingScreen();
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
  assert.fail('Booking loading did not settle');
}

(async () => {
  let state = await settle();
  assert.equal(state.loading, false);
  assert.equal(state.booking.id, 'booking-1');
  assert.equal(calls.length, 1, 'initial render must fetch once');

  state = await settle();
  assert.equal(calls.length, 1, 'rerenders with equivalent project objects must remain idle');

  await state.load(true);
  state = await settle();
  assert.equal(state.refreshing, false);
  assert.equal(calls.length, 2, 'manual refresh must still fetch once');
  console.log('PASS: booking detail load settles; rerenders stay idle and manual refresh remains available.');
})().catch((error) => { console.error(error); process.exitCode = 1; });
