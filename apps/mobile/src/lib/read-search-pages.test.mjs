import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { readSearchPages } from './read-search-pages.ts';
test('native search/pickers include later pages instead of silently stopping at 100', async () => {
  const pages = [];
  const result = await readSearchPages(async page => { pages.push(page); return { data: [page * 100], meta: { pageCount: 3 } }; });
  assert.deepEqual(pages, [1, 2, 3]); assert.deepEqual(result.data, [100, 200, 300]);
});
test('empty search results and failed later pages are not reported as complete successful lists', async () => {
  assert.deepEqual((await readSearchPages(async () => ({ data: [], meta: { pageCount: 0 } }))).data, []);
  await assert.rejects(readSearchPages(async page => { if (page === 2) throw Error('offline'); return { data: [1], meta: { pageCount: 2 } }; }), /offline/);
});
