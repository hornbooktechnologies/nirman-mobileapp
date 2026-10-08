import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import ts from 'typescript';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
function load(path, dependencies = {}, extra = '') {
  const source = readFileSync(new URL(path, import.meta.url), 'utf8') + extra;
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  const exports = {};
  new Function('require', 'exports', compiled)(id => id in dependencies ? dependencies[id] : require(id), exports);
  return exports;
}
const helpers = load('./sales-filter-options.ts');
const records = [
  { id: 'visit-a-1', assignedSalesperson: 'a', assignedSalespersonName: 'Anita' },
  { id: 'visit-b', assignedSalesperson: 'b', assignedSalespersonName: 'Bhavesh' },
  { id: 'visit-a-2', assignedSalesperson: 'a', assignedSalespersonName: 'Anita' },
];
test('salesperson choices are named, distinct and never changed by deriving them', () => {
  assert.deepEqual(helpers.siteVisitSalespeople(records), [{ value: 'a', label: 'Anita' }, { value: 'b', label: 'Bhavesh' }]);
  assert.equal(records.length, 3);
});
test('missing/loading selected labels never display a UUID and retain known names during refresh', () => {
  const id = '423a4f43-147b-4fe6-a685-f605ea0064ef';
  assert.equal(helpers.namedFilterLabel(id, {}, 'Salesperson', true), 'Loading salesperson…');
  assert.equal(helpers.namedFilterLabel(id, {}, 'Salesperson'), 'Salesperson unavailable');
  assert.equal(helpers.namedFilterLabel(id, { [id]: 'Anita' }, 'Salesperson', true), 'Anita');
});
test('a missing actor name cannot replace a known name or expose an internal identifier', () => {
  assert.deepEqual(helpers.siteVisitSalespeople([...records, { assignedSalesperson: 'a', assignedSalespersonName: '' }, { assignedSalesperson: 'c', assignedSalespersonName: '' }]), [{ value: 'a', label: 'Anita' }, { value: 'b', label: 'Bhavesh' }, { value: 'c', label: 'Name unavailable' }]);
});
test('the actual visits page keeps salesperson options independent of all applied list filters', () => {
  const React = require('react');
  const { renderToStaticMarkup } = require('react-dom/server');
  let url = new URLSearchParams();
  const calls = [];
  let filters;
  const Visits = load('./components/site-visits-page.tsx', {
    'next/link': { __esModule: true, default: () => null },
    'next/navigation': { usePathname: () => '/projects/project/sales/site-visits', useSearchParams: () => url, useRouter: () => ({ replace() {} }) },
    '@tanstack/react-query': { useQueryClient: () => ({}) },
    '@/components/ui/refresh-button': { RefreshButton: () => null },
    '@/components/ui': { Button: () => null, Card: () => null, LoadingState: () => null },
    '../hooks/use-sales': { useSalesLifetime: () => ({ current: true }), useSiteVisits: (org, project, query, enabled) => { calls.push({ org, project, query, enabled }); return { data: query.assignedSalesperson ? records.filter(row => row.assignedSalesperson === query.assignedSalesperson) : records, isPending: false, refetch() {} }; } },
    '../sales-rules': { canWriteLead: () => false, instant: x => x, salesKey: () => [] },
    '../site-visit-rules': { visitActionable: () => false },
    '../services/sales.service': { salesService: {} },
    './sales-workspace': {}, './site-visit-form': {},
    './sales-ui': { Failure: () => null, Status: () => null, dateTime: () => '' },
    './sales-filters': { SalesFilters: props => { filters = props; return null; } },
    '../sales-view': { salesDetailUrl: x => x, salesListUrl: x => x },
    '../sales-filter-options': helpers,
  }, '\nexport { Visits };').Visits;
  const context = { org: 'org', project: 'project', permissions: ['leads:read-all'], timezone: 'Asia/Kolkata', active: true, user: 'owner' };
  renderToStaticMarkup(React.createElement(Visits, { c: context }));
  assert.deepEqual(filters.fields.find(field => field.key === 'salesperson').options, ['a', 'b']);
  calls.length = 0;
  url = new URLSearchParams('salesperson=a&status=COMPLETED&search=Anita&from=2026-10-01');
  renderToStaticMarkup(React.createElement(Visits, { c: context }));
  assert.equal(calls[0].query.assignedSalesperson, 'a');
  assert.equal(calls[0].query.status, 'COMPLETED');
  assert.equal(calls[0].query.search, 'Anita');
  assert.deepEqual(calls[1], { org: 'org', project: 'project', query: {}, enabled: true });
  assert.deepEqual(filters.fields.find(field => field.key === 'salesperson').options, ['a', 'b']);
  assert.equal(filters.fields.find(field => field.key === 'salesperson').optionLabels.a, 'Anita');
  calls.length = 0;
  renderToStaticMarkup(React.createElement(Visits, { c: { ...context, permissions: ['leads:read-own'] } }));
  assert.equal(calls[1].enabled, false);
  assert.equal(filters.fields.some(field => field.key === 'salesperson'), false);
});
