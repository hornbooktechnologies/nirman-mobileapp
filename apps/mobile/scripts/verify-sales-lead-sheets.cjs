// Isolated screen orchestration with deferred reads; no network or writes.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const source = fs.readFileSync(path.join(__dirname, '../src/features/sales/sales-lead-screen.tsx'), 'utf8');
const start = source.indexOf('export function SalesLeadScreen()');
const end = source.indexOf('  if (!leadId || !project || !session?.activeOrganization)', start);
assert.ok(start >= 0 && end > start);
const hooks = source.slice(start, end) + `return { sheet, sheetLoading, sheetError, members, units, interests,
  working, bookingIdempotencyKey, setSheet, setSheetRetry, openAssignees, openUnits, openHoldRequests }; }`;

function harness(inventory = true) {
  const slots = [];
  let cursor = 0;
  let effects = [];
  let dirty = false;
  const requests = [];
  const t = (key) => key;
  const same = (a, b) => a && a.length === b.length && a.every((value, i) => Object.is(value, b[i]));
  function memo(factory, deps) {
    const index = cursor++;
    if (!slots[index] || !same(slots[index].deps, deps)) slots[index] = { deps, value: factory() };
    return slots[index].value;
  }
  function request(kind) {
    return new Promise((resolve, reject) => requests.push({ kind, resolve, reject }));
  }
  const exportsObject = {};
  vm.runInNewContext(ts.transpileModule(hooks, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, {
    exports: exportsObject,
    useLocalSearchParams: () => ({ leadId: 'lead-1' }),
    useTranslation: () => ({ t, i18n: { resolvedLanguage: 'en' } }),
    useSession: () => ({ session: { activeOrganization: { id: 'org-1' }, accessToken: 'token' } }),
    getActiveProject: () => ({ id: 'project-1' }),
    getActiveProjectPermissions: () => inventory ? ['inventory:read'] : [],
    formatDateOnly: () => '2026-09-23',
    makeBookingIdempotencyKey: () => 'booking-key',
    getLocalizedErrorMessage: (_cause, fallback) => fallback,
    useState: (initial) => {
      const index = cursor++;
      if (!(index in slots)) slots[index] = initial;
      return [slots[index], (value) => {
        const next = typeof value === 'function' ? value(slots[index]) : value;
        if (!Object.is(slots[index], next)) { slots[index] = next; dirty = true; }
      }];
    },
    useMemo: memo,
    useCallback: (callback, deps) => memo(() => callback, deps),
    useEffect: (effect, deps) => {
      const index = cursor++;
      if (!slots[index] || !same(slots[index].deps, deps)) {
        const cleanup = slots[index]?.cleanup;
        slots[index] = { deps };
        effects.push(() => { cleanup?.(); slots[index].cleanup = effect(); });
      }
    },
    fetchLead: async () => ({ id: 'lead-1', primaryMobile: '9999999999' }),
    fetchActivities: async () => [],
    fetchProjectMembers: () => request('members'),
    fetchUnits: () => request('units'),
    fetchLeadUnitInterests: () => request('interests'),
  });
  function render() {
    cursor = 0;
    dirty = false;
    const state = exportsObject.SalesLeadScreen();
    const nextEffects = effects;
    effects = [];
    nextEffects.forEach((effect) => effect());
    return state;
  }
  async function settle() {
    for (let i = 0; i < 12; i++) {
      const state = render();
      await new Promise((resolve) => setImmediate(resolve));
      if (!dirty) return state;
    }
    assert.fail('Unstable effect dependencies');
  }
  return { render, settle, requests };
}

(async () => {
  for (const sheet of ['assign', 'interest', 'holdRequest', 'booking']) {
    const h = harness();
    let state = await h.settle();
    if (sheet === 'assign') state.openAssignees();
    else if (sheet === 'holdRequest') state.openHoldRequests();
    else state.openUnits(sheet);
    state = h.render();
    assert.equal(state.sheet, sheet, `${sheet} must open before the read resolves`);
    assert.equal(state.sheetLoading, true);
    assert.equal(state.working, false, 'option reads must not lock mutation state');
    state = await h.settle();
    assert.equal(h.requests.length, 1, 'renders must not duplicate option reads');
    h.requests[0].resolve([]);
    state = await h.settle();
    assert.equal(state.sheet, sheet);
    assert.equal(state.sheetLoading, false);
    assert.equal(state.sheetError, null);
  }

  const h = harness();
  let state = await h.settle();
  state.openAssignees();
  state = await h.settle();
  state.setSheet(null);
  state = await h.settle();
  state.openAssignees();
  state = await h.settle();
  h.requests[0].resolve([{ status: 'ACTIVE', user: { id: 'stale' } }]);
  state = await h.settle();
  assert.equal(state.members.length, 0);
  assert.equal(state.sheetLoading, true, 'old completion must not clear new loading state');
  h.requests[1].reject(Error('offline'));
  state = await h.settle();
  assert.equal(state.sheet, 'assign');
  assert.equal(state.sheetError, 'errors.load');
  assert.equal(state.sheetLoading, false);
  state.setSheetRetry((value) => value + 1);
  state = await h.settle();
  h.requests[2].resolve([{ status: 'ACTIVE', user: { id: 'current' } }, { status: 'INACTIVE', user: { id: 'inactive' } }]);
  state = await h.settle();
  assert.equal(state.members.length, 1);
  assert.equal(state.members[0].user.id, 'current');
  assert.equal(state.sheetError, null);

  state.openUnits('booking');
  state = await h.settle();
  h.requests[3].resolve([
    { id: 'available', status: 'AVAILABLE' },
    { id: 'own-hold', status: 'BLOCKED', blockedForLeadId: 'lead-1' },
    { id: 'other-hold', status: 'BLOCKED', blockedForLeadId: 'lead-2' },
    { id: 'booked', status: 'BOOKED' },
  ]);
  state = await h.settle();
  assert.equal(state.units.map((unit) => unit.id).join(','), 'available,own-hold');
  state.openHoldRequests();
  state = await h.settle();
  state.setSheet('stage');
  state = await h.settle();
  h.requests[4].reject(Error('late failure'));
  state = await h.settle();
  assert.equal(state.sheet, 'stage');
  assert.equal(state.sheetError, null, 'closed popup errors must not leak into another action');

  const noInventory = harness(false);
  state = await noInventory.settle();
  state.openUnits('booking');
  state = await noInventory.settle();
  assert.equal(state.sheet, 'booking');
  assert.equal(state.sheetLoading, false);
  assert.ok(state.bookingIdempotencyKey);
  assert.equal(noInventory.requests.length, 0, 'no inventory read without permission');
  console.log('PASS: four popups open immediately; reads settle; stale results ignored; retry, filters and no-inventory booking preserved.');
})().catch((error) => { console.error(error); process.exitCode = 1; });
