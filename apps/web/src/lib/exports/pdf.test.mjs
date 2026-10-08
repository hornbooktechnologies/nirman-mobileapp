import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import ts from 'typescript';

function load(path, dependencies = {}) {
  const source = readFileSync(new URL(path, import.meta.url), 'utf8');
  const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } });
  const exports = {};
  new Function('require', 'exports', outputText)(id => { assert.ok(id in dependencies, `Unexpected dependency ${id}`); return dependencies[id]; }, exports);
  return exports;
}

const axios = { default: { isAxiosError: error => !!error.isAxiosError } };

test('Web requests and downloads the unchanged server PDF with its filename', async () => {
  const bytes = new Blob(['%PDF-1.7\nserver document'], { type: 'application/pdf' });
  let call, clicked, revoked;
  const signal = new AbortController().signal;
  const helper = load('./pdf.ts', { axios, '@/lib/api/api-client': { apiClient: { async get(path, options) { call = { path, options }; return { data: bytes, headers: { 'content-type': 'application/pdf', 'content-disposition': 'attachment; filename="wages-2026-09-01-2026-09-30.pdf"' } }; } } } });
  const file = await helper.requestPdf('/export/pdf', { dateFrom: '2026-09-01' }, signal);
  assert.equal(file.blob, bytes);
  assert.equal(call.options.responseType, 'blob');
  assert.equal(call.options.headers.Accept, 'application/pdf');
  assert.equal(call.options.signal, signal);
  assert.equal(call.options.timeout, 120000);
  const originalUrl = globalThis.URL;
  globalThis.URL = { createObjectURL(blob) { assert.equal(blob, bytes); return 'blob:pdf'; }, revokeObjectURL(value) { revoked = value; } };
  globalThis.window = { dispatchEvent(event) { assert.equal(event.type, 'nirman:pdf-export-ready'); assert.equal(event.detail.blob, bytes); }, setTimeout(callback) { callback(); } };
  globalThis.document = { querySelector() { return null; }, body: { appendChild() {} }, createElement() { return { click() { clicked = { href: this.href, filename: this.download }; }, remove() {} }; } };
  try { helper.downloadPdf(file); assert.deepEqual(clicked, { href: 'blob:pdf', filename: 'wages-2026-09-01-2026-09-30.pdf' }); assert.equal(revoked, 'blob:pdf'); }
  finally { globalThis.URL = originalUrl; delete globalThis.window; delete globalThis.document; }
});

test('Web retains the PDF for a direct user download and starts its automatic download within the modal', () => {
  let attached = false, clicked = false, removed = false;
  const helper = load('./pdf.ts', { axios, '@/lib/api/api-client': { apiClient: {} } });
  const previous = { URL: globalThis.URL, window: globalThis.window, document: globalThis.document };
  globalThis.URL = { createObjectURL() { return 'blob:pdf'; }, revokeObjectURL() {} };
  let retained;
  globalThis.window = { dispatchEvent(event) { retained = event.detail; }, setTimeout(callback) { callback(); } };
  globalThis.document = {
    querySelector(selector) {
      assert.equal(selector, 'dialog[data-pdf-export-progress]:modal');
      return { appendChild(link) { assert.equal(link.hidden, true); attached = true; } };
    },
    body: { appendChild() { assert.fail('Expected the active export dialog to contain the download link'); } },
    createElement() { return { click() { assert.ok(attached); clicked = true; }, remove() { removed = true; } }; },
  };
  try {
    helper.downloadPdf({ blob: new Blob(['%PDF-1.7']), filename: 'report.pdf' });
    assert.ok(clicked && removed);
    assert.equal(retained.filename, 'report.pdf');
    assert.ok(retained.blob instanceof Blob);
  } finally {
    globalThis.URL = previous.URL;
    if (previous.window === undefined) delete globalThis.window; else globalThis.window = previous.window;
    if (previous.document === undefined) delete globalThis.document; else globalThis.document = previous.document;
  }
});

test('Web rejects non-PDF responses and reads server errors from binary request failures', async () => {
  const helper = load('./pdf.ts', { axios, '@/lib/api/api-client': { apiClient: { async get() { return { data: new Blob(['CSV']), headers: { 'content-type': 'text/csv' } }; } } } });
  await assert.rejects(helper.requestPdf('/export/pdf'), /valid PDF/);
  const failure = load('./pdf.ts', { axios, '@/lib/api/api-client': { apiClient: { async get() { throw { isAxiosError: true, response: { data: new Blob([JSON.stringify({ error: { message: 'Choose a shorter period.' } })]) } }; } } } });
  await assert.rejects(failure.requestPdf('/export/pdf'), /shorter period/);
});

for (const moduleName of ['attendance', 'wages', 'kharchi', 'materials', 'expenses', 'progress']) {
  test(`${moduleName}: Web and Mobile consume the PDF endpoint with existing scope and cancellation`, async () => {
    const calls = [];
    const result = {};
    const requestPdf = (...args) => { calls.push(args); return result; };
    const signal = new AbortController().signal;
    const web = load(`../../features/${moduleName}/services/${moduleName}.service.ts`, { '@/lib/exports/pdf': { requestPdf }, '@/lib/api/api-client': { api: {}, apiClient: {} } });
    const webArgs = moduleName === 'attendance' ? ['o', 'p', '2026-09-01', '2026-09-30', signal] : moduleName === 'wages' ? ['o', 'p', 'batch', signal] : ['o', 'p', { search: 'Site' }, signal];
    assert.equal(web[`${moduleName}Service`].exportPdf(...webArgs), result);
    assert.equal(calls[0][0], `/organizations/o/projects/p/${moduleName}/${moduleName === 'wages' ? 'batches/batch/' : ''}export/pdf`);
    assert.equal(calls[0][2], signal);
    const native = load(`../../../../mobile/src/features/${moduleName}/services.ts`, { '../../lib/read-search-pages': load('../../../../mobile/src/lib/read-search-pages.ts'), '../../lib/exports/pdf': { requestPdf }, '../../lib/api': { apiRequest() {}, ApiRequestError: Error }, '../../config': { appConfig: {} } });
    const nativeArgs = moduleName === 'attendance' ? ['o', 'p', '2026-09-01', '2026-09-30', 'token', signal] : moduleName === 'wages' ? ['o', 'p', 'batch', 'token', signal] : ['o', 'p', 'token', { search: 'Site' }, signal];
    const name = moduleName === 'wages' ? 'exportWageBatchPdf' : `export${moduleName[0].toUpperCase() + moduleName.slice(1)}Pdf`;
    assert.equal(native[name](...nativeArgs), result);
    assert.ok(calls[1][0].includes('/export/pdf'));
    assert.equal(calls[1][1], 'token');
    assert.equal(calls[1][2], signal);
    if (!['attendance', 'wages'].includes(moduleName)) assert.ok(calls[1][0].includes('search=Site'));
  });
}

test('Mobile writes exact API bytes and saves/shares the server filename; cancelled requests create no file', async () => {
  const pdf = new TextEncoder().encode('%PDF-1.7\nserver document');
  let created = 0, written, saved, shared;
  class File {
    constructor(directory, name) { this.name = name; this.uri = `${directory}/${name}`; this.exists = false; }
    create() { created++; this.exists = true; }
    write(bytes) { written = bytes; }
    delete() { this.exists = false; }
  }
  class ApiRequestError extends Error { constructor(message, status, code) { super(message); this.status = status; this.code = code; } }
  const native = load('../../../../mobile/src/lib/exports/pdf.ts', {
    'expo-sharing': { async isAvailableAsync() { return true; }, async shareAsync(uri, options) { shared = { uri, ...options }; } },
    'expo-file-system': { File, Paths: { cache: 'file:///cache' } },
    'expo-file-system/legacy': { StorageAccessFramework: { async requestDirectoryPermissionsAsync() { return { granted: true, directoryUri: 'content://downloads' }; }, async createFileAsync(dir, name, mime) { saved = { dir, name, mime }; return 'content://file'; } }, EncodingType: { Base64: 'base64' }, async readAsStringAsync() { return 'PDF bytes'; }, async writeAsStringAsync() {}, async deleteAsync() {} },
    '../../config': { appConfig: { apiBaseUrl: 'https://api.example.test' } }, '../api': { ApiRequestError },
  });
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (_url, options) => { assert.equal(options.headers.Accept, 'application/pdf'); return { ok: true, headers: new Headers({ 'content-type': 'application/pdf', 'content-disposition': 'attachment; filename="wages-2026-09-01.pdf"' }), async arrayBuffer() { return pdf.buffer; } }; };
  try {
    const file = await native.requestPdf('/export/pdf', 'token');
    assert.deepEqual(written, pdf);
    await native.shareExportPdf(file, 'Wages');
    assert.equal(shared.mimeType, 'application/pdf');
    await native.saveExportPdf(file);
    assert.equal(saved.name, 'wages-2026-09-01.pdf');
    const cancelled = new AbortController(); cancelled.abort();
    await assert.rejects(native.requestPdf('/export/pdf', 'token', cancelled.signal), /Cancelled/);
    assert.equal(created, 1);
  } finally { globalThis.fetch = originalFetch; }
});
