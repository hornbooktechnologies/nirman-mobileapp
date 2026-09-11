// Isolated orchestration checks; no network or database writes.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

function load(relativePath, mocks) {
  const source = fs.readFileSync(path.join(__dirname, '../src', relativePath), 'utf8');
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  });
  const exports = {};
  vm.runInNewContext(outputText, { exports, require: (name) => {
    assert.ok(name in mocks, `Unexpected dependency: ${name}`);
    return mocks[name];
  } });
  return exports;
}

function harness({ type = 'BUILDER', permissions = ['projects:create'], create, refresh } = {}) {
  const slots = [];
  let cursor = 0;
  const calls = { create: [], refresh: [], routes: [], close: 0 };
  const project = { id: 'new-project', organizationId: 'org', name: 'New site', status: 'DRAFT' };
  const jsx = (type, props) => ({ type, props });
  const { CreateProjectSheet } = load('features/projects/components/create-project-sheet.tsx', {
    'react/jsx-runtime': { jsx, jsxs: jsx },
    react: {
      useState: (initial) => {
        const i = cursor++;
        if (!(i in slots)) slots[i] = initial;
        return [slots[i], (value) => { slots[i] = value; }];
      },
      useRef: (initial) => {
        const i = cursor++;
        if (!(i in slots)) slots[i] = { current: initial };
        return slots[i];
      },
    },
    'expo-router': { router: { push: (route) => calls.routes.push(route) } },
    'react-i18next': { useTranslation: () => ({ t: (key) => key }) },
    '../../../components/ui': { BottomSheet: 'sheet', Button: 'button', FormError: 'error' },
    '../../../i18n': { getLocalizedErrorMessage: (_error, fallback) => fallback },
    '../../../providers': { useSession: () => ({
      session: { activeOrganization: { id: 'org', type }, accessToken: 'test-token', permissions },
      refreshSession: async (id) => { calls.refresh.push(id); if (refresh) await refresh(); },
    }) },
    '../services': { createProject: async (...args) => {
      calls.create.push(args);
      if (create) await create();
      return project;
    } },
    './project-form-sheet': { ProjectFormSheet: 'form' },
  });
  return { calls, render: () => { cursor = 0; return CreateProjectSheet({ onClose: () => calls.close++ }); } };
}

(async () => {
  for (const type of ['BUILDER', 'CONTRACTOR']) {
    const h = harness({ type });
    await h.render().props.onSave({ name: 'New site', status: 'DRAFT' });
    assert.equal(h.calls.create.length, 1);
    assert.equal(h.calls.create[0][0], 'org');
    assert.equal(h.calls.refresh[0], 'new-project');
    assert.equal(h.calls.routes[0].params.projectId, 'new-project');
    assert.equal(h.calls.close, 1);
  }
  assert.equal(harness({ permissions: [] }).render(), null);

  let finishCreate;
  const doubleTap = harness({ create: () => new Promise((resolve) => { finishCreate = resolve; }) });
  const form = doubleTap.render();
  const saving = form.props.onSave({ name: 'Site' });
  await form.props.onSave({ name: 'Site' });
  form.props.onClose();
  assert.equal(doubleTap.calls.create.length, 1);
  assert.equal(doubleTap.calls.close, 0);
  finishCreate();
  await saving;

  let failRefresh = true;
  const recovery = harness({ refresh: async () => { if (failRefresh) throw new Error('offline'); } });
  await recovery.render().props.onSave({ name: 'Site' });
  assert.equal(recovery.calls.close, 0);
  const saved = recovery.render();
  assert.equal(saved.type, 'sheet');
  assert.equal(saved.props.children[0].props.message, 'form.errors.refreshFailed');
  failRefresh = false;
  saved.props.children[1].props.onPress();
  await new Promise(setImmediate);
  assert.equal(recovery.calls.create.length, 1);
  assert.equal(recovery.calls.refresh.length, 2);
  assert.equal(recovery.calls.routes.length, 1);

  const failure = harness({ create: async () => { throw new Error('rejected'); } });
  await assert.rejects(failure.render().props.onSave({ name: 'Site' }), /rejected/);
  assert.equal(failure.render().type, 'form');
  assert.equal(failure.render().props.saving, false);
  assert.equal(failure.calls.refresh.length, 0);

  const { resolveActiveProjectId } = load('lib/auth/session.ts', { '../storage': {} });
  const access = { projects: [{ id: 'old', status: 'ACTIVE' }, { id: 'new', status: 'DRAFT' }], activeProjectId: 'old' };
  assert.equal(resolveActiveProjectId(access, 'new'), 'new');
  assert.equal(resolveActiveProjectId(access, 'unauthorized'), 'old');
  console.log('PASS: Builder/Contractor creation, permission gate, duplicate taps, pending dismissal, refresh recovery, create failure, authorized Draft selection.');
})().catch((error) => { console.error(error); process.exitCode = 1; });
