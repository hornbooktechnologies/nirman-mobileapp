const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const transpile = source => ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
const rules = {};
vm.runInNewContext(transpile(fs.readFileSync(path.join(__dirname, '../src/features/wages/wage-rules.ts'), 'utf8')), { exports: rules, Intl, Date });
const constants = {};
vm.runInNewContext(transpile(fs.readFileSync(path.join(__dirname, '../../../packages/shared/src/constants/wages.ts'), 'utf8')), { exports: constants });
for (const language of ['en', 'hi', 'gu']) {
  const labels = JSON.parse(fs.readFileSync(path.join(__dirname, `../src/i18n/locales/${language}/wages.json`), 'utf8'));
  for (const [keys, group] of [[constants.WAGE_BATCH_STATUSES, 'batchStatus'], [constants.WAGE_PAYMENT_STATUSES, 'paymentStatus'], [constants.WAGE_PAYMENT_METHODS, 'paymentMethod']]) {
    for (const key of keys) assert.ok(labels[group][key], `${language}: missing ${group}.${key}`);
  }
}
const source = fs.readFileSync(path.join(__dirname, '../src/features/wages/wage-batch-detail-screen.tsx'), 'utf8');
const start = source.indexOf('function WageBatchDetailContent()');
const end = source.indexOf('  const totalDue', start);
assert.ok(start > 0 && end > start);

async function screen(status = 'ACTIVE', batchStatus = 'CONFIRMED', grants = ['wages:read', 'wages:mark-paid', 'wages:update', 'wages:cancel']) {
  const slots = []; let cursor = 0, nextKey = 0;
  const calls = [], writes = [];
  const item = { id: 'item', wageBatchId: 'batch', workerId: 'worker', netAmount: '100.00', paidAmount: '0.00', adjustmentAmount: '0.00', notes: null, kharchiDeduction: '0.00' };
  let detail = { id: 'batch', status: batchStatus, items: [item], payments: [], totals: { paidAmount: '0.00' } };
  let payment = async () => detail;
  class ApiRequestError extends Error { constructor(status) { super('failure'); this.status = status; } }
  const context = {
    ...rules, Intl, Date, Math, Number, console,
    useState: initial => { const i = cursor++; if (!(i in slots)) slots[i] = typeof initial === 'function' ? initial() : initial; return [slots[i], value => { slots[i] = typeof value === 'function' ? value(slots[i]) : value; }]; },
    useRef: initial => { const i = cursor++; return slots[i] ?? (slots[i] = { current: initial }); },
    useMemo: fn => fn(), useCallback: fn => fn, useEffect: () => {},
    useTranslation: () => ({ t: key => key }), useLocalization: () => ({ language: 'en' }),
    useLocalSearchParams: () => ({ batchId: 'batch', projectId: 'project' }),
    useSession: () => ({ session: { accessToken: 'token', activeOrganization: { id: 'org', timezone: 'Asia/Kolkata' } } }),
    getRouteProject: () => ({ id: 'project', status, permissions: grants }),
    usePdfExport: () => ({}), useRefreshOnFocus: () => {},
    remainingValue: value => Math.max(0, Number(value.netAmount) - Number(value.paidAmount)),
    isSettledByKharchi: () => false,
    formatInr: value => String(value), getLocalizedErrorMessage: (_, fallback) => fallback,
    uuid: { v4: () => `key-${++nextKey}` }, ApiRequestError,
    Alert: { alert: () => {} },
    fetchWageBatchDetail: async () => detail,
    recordWagePayment: async (...args) => { calls.push(args); return payment(); },
    updateWageItem: async (...args) => { writes.push(args); return detail; },
    cancelWageBatch: async (...args) => { writes.push(args); return detail; },
  };
  vm.createContext(context);
  vm.runInContext(transpile(source.slice(start, end) + 'return { loadDetail, openWorker, pay, saveAdjustment, cancelBatch, setCancellationReason, setAmount, setReference, setAdjustmentAmount, paymentAttempt, closeWorker, detail, selectedItemId }; }'), context);
  const render = () => { cursor = 0; return context.WageBatchDetailContent(); };
  let view = render(); await view.loadDetail(); view = render(); view.openWorker(item); view = render();
  return { render, view, calls, writes, item, ApiRequestError, setPayment: fn => { payment = fn; }, setDetail: next => { detail = next; }, detail: () => detail };
}

(async () => {
  const s = await screen();
  let reject;
  s.setPayment(() => new Promise((_, fail) => { reject = fail; }));
  const first = s.view.pay(); await s.view.pay();
  assert.equal(s.calls.length, 1, 'synchronous guard prevents duplicate payment taps');
  reject(new s.ApiRequestError(503)); await first;
  let view = s.render();
  assert.equal(view.paymentAttempt.idempotencyKey, 'key-1');
  view.setAmount('1.00'); view.setReference('changed'); view = s.render();
  view.closeWorker(); assert.equal(s.render().selectedItemId, 'item', 'uncertain attempt cannot be dismissed');
  s.setPayment(async () => ({ ...s.detail(), status: 'PAID' }));
  await view.pay();
  assert.equal(JSON.stringify(s.calls[0][3]), JSON.stringify(s.calls[1][3]), 'retry retains original key and complete payload');
  assert.equal('wageItemId' in s.calls[0][3], false, 'payment body respects API DTO');
  assert.equal(s.render().paymentAttempt, null);

  const stale = await screen();
  stale.setDetail({ ...stale.detail(), items: [{ ...stale.item, adjustmentAmount: '1.00' }] });
  await stale.view.saveAdjustment();
  assert.equal(stale.writes.length, 0, 'fresh detail prevents stale adjustment overwrite');

  for (const [project, batch, grants] of [['ARCHIVED', 'CONFIRMED'], ['ACTIVE', 'CANCELLED'], ['ACTIVE', 'CONFIRMED', ['wages:read']]]) {
    const blocked = await screen(project, batch, grants);
    await blocked.view.pay(); await blocked.view.saveAdjustment();
    blocked.view.setCancellationReason('Correction'); await blocked.render().cancelBatch();
    assert.equal(blocked.calls.length + blocked.writes.length, 0, 'read-only/cancelled/unauthorized screens cannot mutate');
  }
  const paid = await screen(); paid.setDetail({ ...paid.detail(), payments: [{}] });
  await paid.view.loadDetail(); paid.view.setCancellationReason('Correction'); await paid.render().cancelBatch();
  assert.equal(paid.writes.length, 0, 'payment history blocks cancellation');

  const invalid = await screen(); invalid.view.setAmount('0.001'); await invalid.render().pay();
  assert.equal(invalid.calls.length, 0, 'fractional paise rejected');
  invalid.view.setAmount('100.01'); await invalid.render().pay(); assert.equal(invalid.calls.length, 0, 'overpayment rejected');
  console.log('Wages Mobile: duplicate taps, retry payload/key, DTO body, stale adjustment, archived/cancelled/permission guards, paid cancellation and paise checks passed.');
})().catch(error => { console.error(error); process.exitCode = 1; });
