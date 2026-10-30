const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const transpile = source => ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
const route = {};
vm.runInNewContext(transpile(fs.readFileSync(path.join(__dirname, '../src/features/notifications/notification-routing.ts'), 'utf8')), { exports: route });
const projects = [{ id: 'project', permissions: ['materials:read'] }];
assert.equal(route.notificationProjectAccess({ organizationId: 'other', projectId: 'project', referenceType: 'material_request' }, 'org', projects), false);
assert.equal(route.notificationProjectAccess({ organizationId: 'org', projectId: 'missing', referenceType: 'material_request' }, 'org', projects), false);
assert.equal(route.notificationProjectAccess({ organizationId: 'org', projectId: 'project', referenceType: 'lead' }, 'org', projects), false);
assert.equal(route.notificationProjectAccess({ organizationId: 'org', projectId: 'project', referenceType: 'material_request' }, 'org', projects), true);
assert.equal(route.notificationHref({ referenceType: 'material_request', referenceId: 'request', projectId: 'project' }).params.projectId, 'project');
assert.equal(route.notificationHref({ referenceType: 'site_visit', referenceId: 'visit', projectId: 'project' }).params.view, 'visits');
assert.equal(route.notificationProjectAccess({ organizationId: 'org', projectId: null, referenceType: null }, 'org', projects), true, 'existing organization-level destinations are retained');

const source = fs.readFileSync(path.join(__dirname, '../src/features/workers/worker-profile-actions.tsx'), 'utf8');
const start = source.indexOf('export function WorkerProfileActions(');
const end = source.indexOf('  return <View', start);
assert.ok(start >= 0 && end > start);
function profile(grants, organizationGrants = [], status = 'ACTIVE') {
  let cursor = 0;
  const slots = [], calls = [];
  let duplicates = [], delay;
  const worker = { id: 'worker', name: 'Worker', trade: 'Mason', mobileNumber: null, baseDailyRate: '500.00', notes: null, status };
  const exports = {};
  const context = {
    exports, Number,
    useState: initial => { const i = cursor++; if (!(i in slots)) slots[i] = initial; return [slots[i], value => { slots[i] = typeof value === 'function' ? value(slots[i]) : value; }]; },
    useRef: initial => { const i = cursor++; return slots[i] ?? (slots[i] = { current: initial }); },
    useTranslation: () => ({ t: key => key }),
    useSession: () => ({ session: { activeOrganization: { id: 'org' }, permissions: organizationGrants, accessToken: 'token' } }),
    isValidPhone: value => /^\d{10}$/.test(value),
    getLocalizedErrorMessage: (_, fallback) => fallback,
    fetchWorkerDuplicateCandidates: async () => duplicates,
    updateWorker: async (...args) => { calls.push(['update', ...args]); if (delay) await delay; return worker; },
    deleteWorker: async (...args) => { calls.push(['delete', ...args]); return {}; },
    deactivateWorker: async (...args) => { calls.push(['deactivate', ...args]); return { ...worker, status: 'INACTIVE' }; },
  };
  vm.runInNewContext(transpile(source.slice(start, end) + 'return { open, save, remove, deactivate, setForm, setReason, setAcknowledged, error }; }'), context);
  const render = () => { cursor = 0; return exports.WorkerProfileActions({ worker, permissions: grants, onSaved: () => {}, onDeleted: () => {} }); };
  return { render, calls, setDuplicates: value => { duplicates = value; }, setDelay: value => { delay = value; } };
}

async function verifyWorkerCreation(projectId, allowAssignment, unassign = false) {
  const screenSource = fs.readFileSync(path.join(__dirname, '../src/features/workers/workers-screen.tsx'), 'utf8');
  const begin = screenSource.indexOf('function CreateWorkerSheet(');
  const finish = screenSource.indexOf('  return (', begin);
  assert.ok(begin > 0 && finish > begin);
  let cursor = 0;
  const slots = [], writes = [];
  const context = {
    Number, Object,
    useState: initial => { const i = cursor++; if (!(i in slots)) slots[i] = typeof initial === 'function' ? initial() : initial; return [slots[i], value => { slots[i] = typeof value === 'function' ? value(slots[i]) : value; }]; },
    useRef: value => { const i = cursor++; return slots[i] ?? (slots[i] = { current: value }); },
    useTranslation: () => ({ t: key => key }), today: () => '2026-10-29',
    isValidPhone: value => /^\d{10}$/.test(value), isValidNonNegativeNumber: value => /^\d+(\.\d{1,2})?$/.test(value), isValidDateOnly: value => /^\d{4}-\d{2}-\d{2}$/.test(value),
    fetchWorkerDuplicateCandidates: async () => [],
    createWorker: async (...args) => { writes.push(args); return {}; },
    getLocalizedErrorMessage: (_, fallback) => fallback,
  };
  vm.createContext(context);
  vm.runInContext(transpile(screenSource.slice(begin, finish) + 'return { submit, setForm, setAssignToProject }; }'), context);
  const render = () => { cursor = 0; return context.CreateWorkerSheet({ organizationId: 'org', projectId, allowAssignment, accessToken: 'token', saving: false, onSaving: () => {}, onSaved: async () => {} }); };
  render().setForm({ name: 'Worker', trade: 'Mason', mobileNumber: '', dailyRate: '500.00', startsOn: projectId ? '2026-10-29' : '' });
  if (unassign) render().setAssignToProject(false);
  const view = render(); await Promise.all([view.submit(), view.submit()]);
  assert.equal(writes.length, 1, 'worker creation rejects duplicate simultaneous taps');
  assert.equal(writes[0][2].projectId, allowAssignment && !unassign ? projectId : null);
  assert.equal(writes[0][2].startsOn, allowAssignment && !unassign ? '2026-10-29' : null);
}

(async () => {
  const reader = profile(['workers:read']);
  await reader.render().save(); await reader.render().remove(); await reader.render().deactivate();
  assert.equal(reader.calls.length, 0, 'read-only users cannot mutate');
  const customDelete = profile(['workers:delete']); await customDelete.render().remove();
  assert.equal(customDelete.calls.length, 0, 'project custom delete permission cannot replace organization authorization');
  const owner = profile(['workers:update', 'workers:deactivate'], ['workers:delete']);
  owner.setDuplicates([{ id: 'another-worker', name: 'Possible duplicate' }]);
  await owner.render().save(); assert.equal(owner.calls.length, 0, 'duplicate warning requires explicit acknowledgement');
  owner.render().setAcknowledged(true); await owner.render().save();
  assert.equal(owner.calls[0][4].dailyRate, 500);
  assert.equal(owner.calls[0][4].mobileNumber, null, 'blank optional values clear with null');
  let resolve;
  owner.setDelay(new Promise(done => { resolve = done; }));
  const view = owner.render(); const one = view.save(); const two = view.save(); resolve(); await Promise.all([one, two]);
  assert.equal(owner.calls.filter(row => row[0] === 'update').length, 2, 'one extra write for two simultaneous taps');
  owner.render().setReason('Keep historical assignments'); await owner.render().deactivate();
  assert.equal(owner.calls.at(-1)[0], 'deactivate'); assert.equal(owner.calls.at(-1)[4], 'Keep historical assignments');
  await owner.render().remove(); assert.equal(owner.calls.at(-1)[0], 'delete');
  const inactive = profile(['workers:deactivate'], [], 'INACTIVE'); await inactive.render().deactivate();
  assert.equal(inactive.calls.length, 0, 'inactive workers cannot be deactivated again');
  await verifyWorkerCreation(null, false);
  await verifyWorkerCreation('project', true);
  await verifyWorkerCreation('project', true, true);
  await verifyWorkerCreation('project', false);
  console.log('Customer parity: notification workspace/project/permission scope, existing destinations, worker role guards, duplicate acknowledgement, null clearing, submission lock and approved deactivation passed.');
})().catch(error => { console.error(error); process.exitCode = 1; });
