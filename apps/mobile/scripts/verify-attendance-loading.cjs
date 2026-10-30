const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const transpile = source => ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
const gateExports = {};
vm.runInNewContext(transpile(fs.readFileSync(path.join(__dirname, '../src/features/attendance/attendance-read-request.ts'), 'utf8')), { exports: gateExports, AbortController });
const { AttendanceReadRequest } = gateExports;

async function verify(file, component, boundary, dataName) {
  const source = fs.readFileSync(path.join(__dirname, '../src/features/attendance', file), 'utf8').replace(/\r\n/g, '\n');
  const start = source.indexOf(`export function ${component}()`);
  const end = source.indexOf(boundary, start);
  assert.ok(start >= 0 && end > start, 'screen hook boundaries exist');
  const slots = [];
  let cursor = 0, dirty = true, pending = [], calls = 0, refreshes = 0, fail = false;
  const same = (a, b) => a && a.length === b.length && a.every((item, i) => Object.is(item, b[i]));
  const useRef = value => { const i = cursor++; if (!slots[i]) slots[i] = { current: value }; return slots[i]; };
  const useMemo = (factory, deps) => { const i = cursor++; if (!slots[i] || !same(slots[i].deps, deps)) slots[i] = { deps, value: factory() }; return slots[i].value; };
  const useEffect = (effect, deps) => {
    const i = cursor++;
    if (!slots[i] || !same(slots[i].deps, deps)) {
      const old = slots[i]; slots[i] = { deps };
      pending.push(() => { old?.cleanup?.(); slots[i].cleanup = effect(); });
    }
  };
  const useState = initial => {
    const i = cursor++;
    if (!(i in slots)) slots[i] = typeof initial === 'function' ? initial() : initial;
    return [slots[i], value => { const next = typeof value === 'function' ? value(slots[i]) : value; if (!Object.is(next, slots[i])) { slots[i] = next; dirty = true; } }];
  };
  const session = { activeOrganization: { id: 'org' }, activeProjectId: 'project', accessToken: 'token', projectAccess: { projects: [{ id: 'project' }] } };
  class ApiRequestError extends Error { constructor(status) { super('denied'); this.status = status; } }
  const read = async (...args) => { calls++; assert.ok(args.at(-1) instanceof AbortSignal, 'read carries cancellation signal'); if (fail) throw new ApiRequestError(403); return { rows: [], exceptions: [], meta: { page: 1, totalPages: 1 }, totals: {} }; };
  const exports = {};
  const t = key => key;
  const context = {
    exports, AttendanceReadRequest, AbortController, console, setTimeout, clearTimeout,
    attendancePeriodIssue: require("../../../packages/shared/dist/attendance-actions.js").attendancePeriodIssue,
    useRef, useMemo, useEffect, useCallback: (fn, deps) => useMemo(() => fn, deps), useState,
    useTranslation: () => ({ t }), useLocalization: () => ({ locale: 'en' }),
    useLocalSearchParams: () => ({ workerId: 'worker', projectId: 'project', startDate: '2026-10-01', endDate: '2026-10-26' }),
    // Session callbacks deliberately rotate on every render, matching SessionProvider.
    useSession: () => ({ session, refreshSession: async () => { refreshes++; dirty = true; }, signOut: async () => {}, switchActiveProject: async () => {} }),
    getActiveProject: () => ({ id: 'project' }), getActiveProjectPermissions: () => ['attendance:read'],
    monthRange: () => ({ startDate: '2026-10-01', endDate: '2026-10-26' }), monthValue: () => '2026-10', todayDateOnly: () => '2026-10-26',
    usePdfExport: () => ({}), PAGE_SIZE: 20,
    emptyAttendanceExceptionDraft: () => ({ duration: 'FULL_DAY', reasonCode: '', notes: '' }),
    fetchAttendanceSummary: read, fetchWorkerAttendancePeriod: read, ApiRequestError,
    getLocalizedErrorMessage: (_, fallback) => fallback,
    useRefreshOnFocus: ({ scopeKey, refresh, reset, cancel }) => {
      const prior = useRef(); const latest = useRef(); latest.current = { reset, cancel };
      useEffect(() => {
        if (prior.current !== scopeKey) { prior.current = scopeKey; latest.current.reset?.(); }
        void refresh(); return () => latest.current.cancel?.();
      }, [scopeKey, refresh]);
    },
  };
  vm.runInNewContext(transpile(source.slice(start, end) + `return { load, error, data: ${dataName}, changeDate: ${component === "AttendanceMarkScreen" ? "setDate" : "setStartDate"} }; }`), context);
  let view;
  const settle = async () => {
    for (let i = 0; i < 30; i++) {
      if (dirty) { dirty = false; cursor = 0; view = exports[component](); }
      const effects = pending; pending = []; effects.forEach(effect => effect());
      await new Promise(resolve => setImmediate(resolve));
      if (!dirty && !pending.length) return;
    }
    assert.fail(`${component} did not settle: repeated API requests`);
  };
  await settle();
  assert.equal(calls, 1, `${component}: one initial request, not a response-driven loop`);
  assert.ok(view.data, `${component}: data stays available after render`);
  dirty = true; await settle();
  assert.equal(calls, 1, `${component}: session callback rotation does not refetch`);
  fail = true; await view.load(); await settle();
  assert.equal(calls, 2, `${component}: 403 refresh does not loop`);
  assert.equal(refreshes, 1);
  assert.equal(view.error, 'errors.accessChanged');
  const staleLoad = view.load;
  fail = false;
  view.changeDate('2026-10-02');
  await settle();
  assert.equal(calls, 3, `${component}: date change performs exactly one read`);
  await staleLoad(); await settle();
  assert.equal(calls, 3, `${component}: stale mutation reload cannot fetch the old scope`);
  for (const slot of slots) slot?.cleanup?.();
}
(async () => {
  await verify('worker-attendance-screen.tsx', 'WorkerAttendanceScreen', '  const workerName', 'period');
  await verify('attendance-mark-screen.tsx', 'AttendanceMarkScreen', '  useEffect(() => {\n    if (!editingRow', 'summary');
  await verify('attendance-screen.tsx', 'AttendanceScreen', '  function openWorkerHistory', 'summary');
  const gate = new AttendanceReadRequest();
  const old = gate.start('old');
  assert.equal(gate.start('old'), null, 'same pending request is deduplicated');
  const current = gate.start('new');
  assert.ok(old.signal.aborted && !old.isCurrent(), 'superseded response cannot update state');
  old.finish(); assert.ok(current.isCurrent(), 'old completion does not clear the new request');
  gate.cancel(); assert.ok(!current.isCurrent() && current.signal.aborted, 'blur cancels in-flight data');
  console.log('Attendance: all 3 screens settle after success and 403; cancellation, deduplication and stale-response guards passed.');
})().catch(error => { console.error(error); process.exitCode = 1; });
