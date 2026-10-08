import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { test } from 'node:test';
const requireWeb = createRequire(new URL('../../../../web/package.json', import.meta.url));
const ts = requireWeb('typescript');
function load(url, dependencies = {}) {
  const source = readFileSync(url, 'utf8');
  const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } });
  const exports = {};
  new Function('require', 'exports', outputText)(id => {
    if (id in dependencies) return dependencies[id];
    if (id === '@nirman-app/shared') return requireWeb(id);
    throw new Error(`Unexpected dependency: ${id}`);
  }, exports);
  return exports;
}

test('Mobile sends every supported list filter and preserves later lead pages/metadata', async () => {
  const calls = [];
  const service = load(new URL('./services.ts', import.meta.url), { '../../lib/api': { apiRequest: async (url, init, auth) => { calls.push({ url: new URL(url, 'https://fixture.invalid'), init, auth }); return { success: true, data: [], meta: { page: 2, limit: 50, total: 101 } }; } } });
  const result = await service.fetchLeads('org', 'project', 'token', { search: 'Customer', stage: 'NEW', assignedTo: 'user', page: 2 });
  assert.equal(result.meta.total, 101);
  assert.deepEqual(Object.fromEntries(calls[0].url.searchParams), { page: '2', limit: '50', search: 'Customer', stage: 'NEW', assignedTo: 'user' });
  const dates = { from: '2026-10-07T18:30:00.000Z', to: '2026-10-08T18:29:59.999Z' };
  await service.fetchFollowUps('org', 'project', 'token', { search: '9876', status: 'MISSED', assignedTo: 'user', ...dates });
  assert.deepEqual(Object.fromEntries(calls[1].url.searchParams), { search: '9876', status: 'MISSED', assignedTo: 'user', ...dates });
  await service.fetchSiteVisits('org', 'project', 'token', { search: 'Customer', status: 'RESCHEDULED', assignedSalesperson: 'user', scheduledFrom: dates.from, scheduledTo: dates.to });
  assert.equal(calls[2].url.searchParams.get('search'), 'Customer');
  assert.equal(calls[2].url.searchParams.get('assignedSalesperson'), 'user');
  assert.equal(calls[2].url.searchParams.get('scheduledTo'), dates.to);
  await service.fetchUnits('org', 'project', 'token', { search: 'A-101', status: 'BLOCKED' });
  assert.equal(calls[3].url.searchParams.get('status'), 'BLOCKED');
  await service.fetchBookings('org', 'project', 'token', { search: 'REF-1', status: 'CONFIRMED', bookedFrom: '2026-10-01', bookedTo: '2026-10-08' });
  assert.deepEqual(Object.fromEntries(calls[4].url.searchParams), { status: 'CONFIRMED', search: 'REF-1', bookedFrom: '2026-10-01', bookedTo: '2026-10-08' });
  for (const call of calls) { assert.ok(call.url.pathname.startsWith('/organizations/org/projects/project/sales/')); assert.equal(call.auth.accessToken, 'token'); }
});

test('Mobile follow-up updates preserve all fields and failed commands are sent only once', async () => {
  const calls = [];
  const service = load(new URL('./services.ts', import.meta.url), { '../../lib/api': { apiRequest: async (url, init) => { calls.push({ url, init }); throw new Error('Interrupted'); } } });
  const update = { status: 'COMPLETED', notes: 'Existing note', outcome: 'Reached customer', nextFollowUpAt: '2026-10-09T04:30:00Z' };
  await assert.rejects(service.updateFollowUp('org', 'project', 'lead', 'followup', 'token', update));
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, '/organizations/org/projects/project/sales/leads/lead/follow-ups/followup');
  assert.equal(calls[0].init.method, 'PATCH');
  assert.deepEqual(JSON.parse(calls[0].init.body), update);
  const booking = { idempotencyKey: 'stable', leadId: 'lead', bookingDate: '2026-10-08', bookingAmount: 0 };
  await assert.rejects(service.createBooking('org', 'project', 'token', booking));
  assert.equal(calls.length, 2);
  assert.deepEqual(JSON.parse(calls[1].init.body), booking);
});

test('both clients parse the same CSV, money units and errors', () => {
  const mobile = load(new URL('./unit-import.ts', import.meta.url));
  const web = load(new URL('../../../../web/src/features/sales/unit-import.ts', import.meta.url));
  assert.deepEqual(mobile.UNIT_IMPORT_COLUMNS, web.UNIT_IMPORT_COLUMNS);
  const header = mobile.UNIT_IMPORT_COLUMNS.join(',');
  for (const csv of [header + '\nA-101,Flat,A,1,1000,East,TOTAL,50,LAKH,,AVAILABLE', header + '\nA-102,Flat,A,1,1000,East,PER_SQFT,,,5000,AVAILABLE', header + '\nA-103,Flat,A,1,1000,East,TOTAL,50,LAKH,,BOOKED', header + '\nA-104,Flat,A,1,1000,East,TOTAL,50,LAKH,,AVAILABLE\nA-104,Flat,A,1,1000,East,TOTAL,50,LAKH,,AVAILABLE']) {
    assert.deepEqual(mobile.parseUnitImport(csv), web.parseUnitImport(csv));
  }
});

test('activity details expose readable linkage and notes without internal IDs', () => {
  const mobile = load(new URL('./sales-activity.ts', import.meta.url));
  const rows = mobile.salesActivityDetails({ details: { bookingId: 'private-id', assignedTo: 'private-user', notes: 'Keep this note', scheduledAt: '2026-10-08T04:30:00Z' }, bookingReference: 'REF-1', assignedToName: 'Sales User', unitNumber: 'A-101' });
  assert.ok(rows.some(row => row.value === 'REF-1'));
  assert.ok(rows.some(row => row.value === 'Keep this note'));
  assert.ok(rows.some(row => row.value === 'Sales User'));
  assert.equal(rows.some(row => row.value.startsWith('private-')), false);
});

test('all Sales English status, source, activity and follow-up labels match Web', () => {
  const mobile = JSON.parse(readFileSync(new URL('../../i18n/locales/en/sales.json', import.meta.url), 'utf8'));
  const web = load(new URL('../../../../web/src/features/sales/sales-rules.ts', import.meta.url));
  for (const group of ['stage', 'priority', 'source', 'activity', 'followUpType', 'followUpStatus', 'visitStatus', 'unitStatus', 'bookingStatus', 'unitInterestStatus']) {
    for (const [value, label] of Object.entries(mobile[group])) assert.equal(web.label(value), label, `${group}.${value}`);
  }
});
