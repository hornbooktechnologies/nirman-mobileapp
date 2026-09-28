const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const source = fs.readFileSync(path.join(__dirname, '../src/features/gallery/queue.ts'), 'utf8');
const js = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
let stored = JSON.stringify([{ entryId: 'photo', state: 'QUEUED', attempts: 0, idempotencyKey: 'stable' }]);
function runtime() {
  const exports = {};
  vm.runInNewContext(js, { exports, require(name) {
    if (name.includes('async-storage')) return { default: {
      getItem: async () => stored,
      setItem: async (_, value) => { stored = value; },
    } };
    if (name.includes('file-system')) return { documentDirectory: 'file:///test/' };
    throw new Error(name);
  } });
  return exports;
}
(async () => {
  const queue = runtime();
  let release;
  const pending = new Promise(resolve => { release = resolve; });
  let markStarted;
  const started = new Promise(resolve => { markStarted = resolve; });
  let requests = 0;
  const first = queue.runGalleryUpload('photo', async () => {
    requests++;
    await queue.updateGalleryQueue('photo', { state: 'UPLOADING', attempts: 1 });
    markStarted();
    await pending;
  });
  await queue.runGalleryUpload('photo', async () => { requests++; });
  assert.equal(requests, 1, 'rapid retry must not start another request');
  await started;
  assert.equal((await queue.readGalleryQueue())[0].state, 'UPLOADING', 'refresh must preserve an active first attempt');
  await queue.updateGalleryQueue('other', { state: 'FAILED' });
  assert.equal((await queue.readGalleryQueue())[0].state, 'UPLOADING', 'another queue write must preserve active uploads');
  assert.equal((await runtime().readGalleryQueue())[0].state, 'FAILED', 'restart must recover interrupted uploads');
  release();
  await first;
  await assert.rejects(queue.runGalleryUpload('photo', async () => { throw new Error('offline'); }), /offline/);
  await queue.runGalleryUpload('photo', async () => { requests++; });
  assert.equal(requests, 2, 'a completed or rejected attempt must release the retry lock');
  assert.equal((await queue.readGalleryQueue())[0].idempotencyKey, 'stable');
  console.log('Gallery queue regression checks passed.');
})().catch(error => { console.error(error); process.exitCode = 1; });
