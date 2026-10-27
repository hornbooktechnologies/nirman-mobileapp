import vm from 'node:vm';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import ts from 'typescript';
const source = ts.transpileModule(readFileSync(new URL('./multipart-upload.ts', import.meta.url), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
function client(platform, response, failure) {
  const exports = {}; const calls = [];
  new Function('exports', 'require', 'fetch', source)(exports, name => {
    if (name === 'react-native') return { Platform: { OS: platform } };
    if (name === 'expo-file-system') return { File: class { constructor(uri) { this.uri = uri; } async bytes() { return new TextEncoder().encode(this.uri); } } };
    return { apiRequest: async (...args) => { calls.push(args); if (failure) throw failure; return response; } };
  }, async () => ({ ok: true, blob: async () => 'file-blob' }));
  return { ...exports, calls };
}
test('native multipart retains URI/name/MIME without setting a JSON content type', async () => {
  const api = client('android', { success: true, data: { id: 'asset' } });
  const parts = []; const form = { append: (...args) => parts.push(args) };
  const file = { uri: 'file:///photo.jpg', name: 'photo.jpg', type: 'image/jpeg' };
  await api.appendUploadFile(form, file);
  assert.equal(parts[0][0], 'file');
  assert.equal(parts[0][1].uri, file.uri);
  assert.equal(parts[0][1].name, file.name);
  assert.equal(parts[0][1].type, file.type);
  assert.equal(new TextDecoder().decode(await parts[0][1].bytes()), file.uri);
  assert.deepEqual(await api.multipartUpload('/uploads', 'token', form), { id: 'asset' });
  assert.equal(api.calls[0][1].body, form);
  assert.equal(api.calls[0][1].headers, undefined);
});
test('native upload parts serialize through the installed Expo fetch converter', async () => {
  const converterSource = ts.transpileModule(readFileSync(new URL('../../node_modules/expo/src/winter/fetch/convertFormData.ts', import.meta.url), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  const converter = {};
  new Function('exports', 'require', converterSource)(converter, () => ({ blobToArrayBufferAsync: blob => blob.arrayBuffer() }));
  for (const platform of ['android', 'ios']) {
    const parts = [['title', 'Profile photo']];
    await client(platform).appendUploadFile({ append: (...args) => parts.push(args) }, { uri: 'file:///photo.jpg', name: 'profile.jpg', type: 'image/jpeg' });
    const { body } = await converter.convertFormDataAsync({ entries: () => parts }, 'test-boundary');
    const encoded = new TextDecoder().decode(body);
    assert.match(encoded, /filename="profile.jpg"/);
    assert.match(encoded, /content-type: image\/jpeg/);
    assert.match(encoded, /file:\/\/\/photo.jpg/);
    assert.match(encoded, /Profile photo/);
  }
});
test('Expo web appends file bytes with a filename instead of a React Native object', async () => {
  const api = client('web'); const parts = [];
  await api.appendUploadFile({ append: (...args) => parts.push(args) }, { uri: 'blob:photo', name: 'photo.jpg', type: 'image/jpeg' });
  assert.deepEqual(parts, [['file', 'file-blob', 'photo.jpg']]);
});
test('malformed successful responses cannot claim an upload succeeded', async () => {
  for (const response of [null, {}, { success: false }, { success: true, data: null }]) {
    await assert.rejects(client('android', response).multipartUpload('/uploads', 'token', {}), /invalid upload response/);
  }
});
test('API errors preserve status and diagnostic information for the popup', async () => {
  const error = Object.assign(new Error('Unsupported image format'), { status: 400, code: 'GALLERY_MEDIA_TYPE_UNSUPPORTED' });
  await assert.rejects(client('android', null, error).multipartUpload('/uploads', 'token', {}), actual => actual === error);
});

test('brochure upload uses Expo UUIDs without a browser crypto global', async () => {
  const code = ts.transpileModule(readFileSync(new URL('../features/brochures/services.ts', import.meta.url), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  const exports = {}; let ids = 0; let submitted;
  class Form { constructor() { this.parts = []; } append(...args) { this.parts.push(args); } }
  new Function('exports', 'require', 'FormData', 'crypto', code)(exports, name => {
    if (name === 'expo') return { uuid: { v4: () => `11111111-1111-4111-8111-${String(++ids).padStart(12, '0')}` } };
    if (name.includes('multipart-upload')) return { appendUploadFile: async (form, file) => form.append('file', file), multipartUpload: async (path, token, form) => { submitted = { path, token, form }; return { id: 'asset' }; } };
    if (name.includes('config')) return { appConfig: { apiBaseUrl: 'https://api.example.test/api/v1' } };
    return { apiRequest: async () => ({ data: {} }) };
  }, Form, undefined);
  assert.deepEqual(await exports.uploadBrochure('org', 'project', 'access', { uri: 'file:///brochure.pdf', name: 'brochure.pdf', mimeType: 'application/pdf', title: 'Overview', category: 'PROJECT' }), { id: 'asset' });
  assert.equal(ids, 2);
  assert.equal(submitted.path, '/organizations/org/projects/project/brochures');
  assert.ok(submitted.form.parts.some(([key, value]) => key === 'file' && value.type === 'application/pdf'));
});

test('brochure loading is stable across recreated session/project objects', async () => {
  const source = readFileSync(new URL('../features/brochures/brochures-screen.tsx', import.meta.url), 'utf8');
  const start = source.indexOf('  const load = useCallback(');
  const end = source.indexOf('  useRefreshOnFocus(', start);
  assert.ok(start > 0 && end > start);
  let callback; let previous; let calls = 0;
  const t = key => key;
  function render() {
    const context = {
      loadOrganizationId: 'org', loadProjectId: 'project', loadAccessToken: 'access',
      project: { id: 'project' }, session: { activeOrganization: { id: 'org' }, accessToken: 'access' }, t,
      alive: { current: true }, setError: () => {}, setItems: () => {}, setSelected: () => {}, setLoading: () => {},
      fetchBrochures: async () => { calls++; return { items: [] }; },
      useCallback: (next, deps) => {
        if (!previous || !deps.every((value, index) => Object.is(value, previous[index]))) { callback = next; previous = deps; }
        return callback;
      },
    };
    return vm.runInNewContext(ts.transpileModule(`(function () { ${source.slice(start, end)} return load; })()`, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, context);
  }
  const first = render(); await first();
  assert.equal(render(), first, 'successful data updates must not restart the focus loader');
  assert.equal(calls, 1);
});
