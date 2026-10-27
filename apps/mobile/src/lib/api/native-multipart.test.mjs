import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import ts from 'typescript';

test('native multipart uses URI-backed XHR and preserves API auth/error handling', async () => {
  for (const platform of ['android', 'ios', 'web']) {
    let sent;
    let xhr;
    let fetchCalls = 0;
    class Request {
      constructor() { xhr = this; this.headers = {}; this.status = 413; this.responseText = JSON.stringify({ message: 'Too large' }); }
      open(method, url) { this.method = method; this.url = url; }
      setRequestHeader(key, value) { this.headers[key] = value; }
      send(body) { sent = body; queueMicrotask(() => this.onload()); }
    }
    function load(path, require) {
      const exports = {};
      const code = ts.transpileModule(readFileSync(new URL(path, import.meta.url), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
      new Function('exports', 'require', 'XMLHttpRequest', 'fetch', code)(exports, require, Request, async () => { fetchCalls++; return { ok: true, json: async () => ({ data: 'web' }) }; });
      return exports;
    }
    const native = load('./native-multipart.ts', () => ({}));
    const api = load('./api-client.ts', name => name === 'react-native' ? { Platform: { OS: platform } } : name.includes('config') ? { appConfig: { apiBaseUrl: 'https://api.test' } } : native);
    const form = new FormData();
    form.append('title', 'Brochure');
    if (platform === 'web') {
      await api.apiRequest('/uploads', { method: 'POST', body: form }, { accessToken: 'access' });
      assert.equal(fetchCalls, 1);
      assert.equal(xhr, undefined);
    } else {
      await assert.rejects(api.apiRequest('/uploads', { method: 'POST', body: form }, { accessToken: 'access' }), error => error.status === 413 && error.message === 'Too large');
      assert.equal(fetchCalls, 0, 'native uploads must bypass Expo fetch serialization');
      assert.equal(sent, form);
      assert.equal(xhr.headers.authorization, 'Bearer access');
      assert.equal(xhr.headers['content-type'], undefined);
      assert.equal(xhr.url, 'https://api.test/uploads');
    }
  }
});
