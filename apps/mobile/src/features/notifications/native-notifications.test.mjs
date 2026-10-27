import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import ts from 'typescript';
const code = ts.transpileModule(readFileSync(new URL('./native-notifications.ts', import.meta.url), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
function setup({ platform = 'android', expoGo = false, nativeModule = true, throws = false } = {}) {
  const exports = {}; let loads = 0, warnings = 0;
  const notifications = { supported: true };
  new Function('exports', 'require', 'console', code)(exports, name => {
    if (name === 'expo') return { isRunningInExpoGo: () => expoGo, requireOptionalNativeModule: () => nativeModule ? {} : null };
    if (name === 'react-native') return { Platform: { OS: platform } };
    if (name === 'expo-notifications') { loads++; if (throws) throw new Error('native mismatch'); return notifications; }
    throw new Error(name);
  }, { warn: () => warnings++ });
  return { get: exports.getNativeNotifications, notifications, loads: () => loads, warnings: () => warnings };
}
test('Expo Go never evaluates the crashing native notifications barrel', () => {
  const client = setup({ expoGo: true });
  assert.equal(client.get(), null); assert.equal(client.get(), null);
  assert.equal(client.loads(), 0);
});
test('web never loads native notifications', () => {
  const client = setup({ platform: 'web' }); assert.equal(client.get(), null); assert.equal(client.loads(), 0);
});
test('older Android clients skip missing native modules and warn once', () => {
  const client = setup({ nativeModule: false });
  assert.equal(client.get(), null); assert.equal(client.get(), null);
  assert.equal(client.loads(), 0); assert.equal(client.warnings(), 1);
});
test('compatible standalone clients retain notification support', () => {
  const client = setup(); assert.equal(client.get(), client.notifications); assert.equal(client.get(), client.notifications); assert.equal(client.loads(), 1);
});
test('other native import failures cannot crash app startup or spam warnings', () => {
  const client = setup({ throws: true });
  assert.equal(client.get(), null); assert.equal(client.get(), null);
  assert.equal(client.loads(), 1); assert.equal(client.warnings(), 1);
});
