/* Isolated browser regression test: no authentication, API calls, or database writes. */
async function main() {
  const [fs, path, http, { spawn }, { default: assert }, { pathToFileURL }] = await Promise.all([
    import('node:fs'), import('node:path'), import('node:http'), import('node:child_process'), import('node:assert/strict'), import('node:url'),
  ]);
  const root = path.resolve(__dirname, '../../..');
  const store = path.join(root, 'node_modules/.pnpm');
  const { default: esbuild } = await import(pathToFileURL(path.join(store, fs.readdirSync(store).find((name) => name.startsWith('esbuild@')), 'node_modules/esbuild/lib/main.js')).href);
  const directory = path.join(root, '.tmp/form-validation-browser');
  fs.mkdirSync(directory, { recursive: true });
  const bundle = await esbuild.build({
    stdin: { contents: `
      import React, { useState } from 'react';
      import { createRoot } from 'react-dom/client';
      import { ValidatedForm, ValidatedField } from './src/components/ui/validated-form';
      import { Input } from './src/components/ui/input';
      import { FormScope as MobileScope, useValidateForm } from '../mobile/src/components/ui/form-scope';
      import { FormField as MobileField } from '../mobile/src/components/ui/form-field';
      import { Input as MobileInput } from '../mobile/src/components/ui/input';
      import { SalesForm } from './src/features/sales/components/sales-form';
      const delay = () => new Promise(resolve => setTimeout(resolve, 50));
      let saves = 0;
      function TestForm() {
        const [name, setName] = useState('');
        const [email, setEmail] = useState('');
        const [conditional, setConditional] = useState(false);
        return <ValidatedForm onSubmit={event => { event.preventDefault(); saves++; }}>
          <ValidatedField><span>Project name</span><Input name="name" required value={name} onChange={e => setName(e.target.value)} /></ValidatedField>
          <ValidatedField>Email<Input name="email" type="email" value={email} onChange={e => setEmail(e.target.value)} /></ValidatedField>
          <ValidatedField htmlFor="code">Optional code</ValidatedField><Input id="code" name="code" minLength={3} />
          <ValidatedField validate={() => 'Must not block a frozen retry'}>Frozen retry value<Input disabled value="" readOnly /></ValidatedField>
          <button type="button" id="toggle" onClick={() => setConditional(!conditional)}>Toggle</button>
          {conditional && <ValidatedField>Reason<Input name="reason" required minLength={8} /></ValidatedField>}
          <button type="submit">Save</button>
        </ValidatedForm>;
      }
      let mobileSaves = 0;
      function MobileSave() {
        const validate = useValidateForm();
        return <button id="mobile-save" onClick={() => { if (validate()) mobileSaves++; }}>Save</button>;
      }
      function MobileCase() {
        const [name, setName] = useState('');
        const [amount, setAmount] = useState('');
        return <MobileScope>
          <MobileField label="Name" required><MobileInput accessibilityLabel="Mobile name" value={name} onChangeText={setName} /></MobileField>
          <MobileField label="Amount" required validate={() => Number(amount) > 0 ? undefined : 'Enter a positive amount.'}><MobileInput accessibilityLabel="Mobile amount" value={amount} onChangeText={setAmount} /></MobileField>
          <MobileField label="Read only" required><MobileInput accessibilityLabel="Read only" value="" editable={false} /></MobileField>
          <MobileSave />
        </MobileScope>;
      }
      const checks = [];
      function check(ok, message) { if (!ok) throw new Error(message); checks.push(message); }
      function type(name, value) {
        const input = document.querySelector('[name="' + name + '"]');
        Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, value);
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.dispatchEvent(new Event('change', { bubbles: true }));
      }
      function submit() { document.querySelector('form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })); }
      window.tests = (async () => {
        const view = createRoot(document.getElementById('root'));
        view.render(<TestForm />);
        await delay();
        check(document.querySelectorAll('[aria-label="required"]').length === 1, 'Required stars appear before interaction');
        check(!document.querySelector('[role="alert"]'), 'Untouched fields start without errors');
        document.querySelector('[name="name"]').dispatchEvent(new FocusEvent('focusout', { bubbles: true }));
        await delay();
        check(document.querySelector('[role="alert"]')?.textContent === 'Project name is required.', 'Blur shows a field-specific error');
        type('name', '   '); submit(); await delay();
        check(saves === 0, 'Whitespace-only required values do not save');
        check(document.activeElement?.getAttribute('name') === 'name', 'Invalid submit focuses the first invalid control');
        const input = document.querySelector('[name="name"]');
        check(input.getAttribute('aria-invalid') === 'true' && !!document.getElementById(input.getAttribute('aria-describedby')), 'Invalid controls link to their error');
        type('name', 'Site A'); await delay();
        check(!document.querySelector('[role="alert"]'), 'Correcting a visited field clears its error');
        type('code', 'ab'); document.querySelector('[name="code"]').dispatchEvent(new FocusEvent('focusout', { bubbles: true })); await delay();
        const code = document.querySelector('[name="code"]');
        check(code.getAttribute('aria-invalid') === 'true' && document.getElementById(code.getAttribute('aria-describedby'))?.textContent.includes('3 characters'), 'Separate labels validate on blur and link controls to errors');
        type('code', ''); await delay();
        check(code.getAttribute('aria-invalid') !== 'true', 'Separate-label errors clear when optional values are removed');
        type('email', 'bad'); document.querySelector('[name="email"]').dispatchEvent(new FocusEvent('focusout', { bubbles: true })); await delay();
        check(document.querySelector('[role="alert"]')?.textContent.includes('valid email'), 'Optional malformed email is checked on blur');
        type('email', ''); await delay(); submit(); await delay();
        check(saves === 1, 'Optional empty email permits a valid save');
        check(saves === 1, 'Disabled fields do not block frozen-command retries');
        document.getElementById('toggle').click(); await delay(); submit(); await delay();
        check(saves === 1 && document.querySelector('[name="reason"]').getAttribute('aria-invalid') === 'true', 'New conditional fields block invalid saves');
        document.getElementById('toggle').click(); await delay(); submit(); await delay();
        check(saves === 2, 'Unmounted conditional fields do not block saves');
        view.render(<MobileCase />); await delay();
        check(!document.querySelector('[role="alert"]'), 'Mobile untouched fields start without errors');
        document.querySelector('[aria-label="Mobile name"]').dispatchEvent(new FocusEvent('focusout', { bubbles: true })); await delay();
        check(document.querySelector('[role="alert"]')?.textContent === 'Name is required.', 'Mobile blur shows a localized field error');
        document.getElementById('mobile-save').click(); await delay();
        check(mobileSaves === 0 && [...document.querySelectorAll('[role="alert"]')].some(node => node.textContent === 'Enter a positive amount.'), 'Mobile submit validates domain rules before saving');
        function mobileType(label, value) {
          const input = document.querySelector('[aria-label="' + label + '"]');
          Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, value);
          input.dispatchEvent(new Event('input', { bubbles: true }));
        }
        mobileType('Mobile name', 'Worker'); mobileType('Mobile amount', '20'); await delay();
        check(!document.querySelector('[role="alert"]'), 'Mobile visible errors update while correcting values');
        document.getElementById('mobile-save').click(); await delay();
        check(mobileSaves === 1, 'Mobile read-only fields do not block a valid save');
        let salesSaves = 0, salesCloses = 0, confirmations = 0, savedValues;
        let finishSave;
        window.confirm = () => { confirmations++; return false; };
        view.render(<SalesForm title="Test sales form"
          fields={[{ name: 'customerName', label: 'Customer name', required: true }, { name: 'priority', label: 'Priority', type: 'checkbox' }]}
          save={values => { salesSaves++; savedValues = values; return new Promise(resolve => { finishSave = resolve; }); }}
          close={() => { salesCloses++; }} refresh={async () => {}} />);
        await delay();
        submit(); await delay();
        check(salesSaves === 0, 'Sales invalid input cannot reach the save handler');
        type('customerName', '  Customer A  '); await delay();
        const cancel = () => [...document.querySelectorAll('button')].find(node => node.textContent === 'Cancel').click();
        cancel(); await delay();
        check(confirmations === 1 && salesCloses === 0, 'Sales dirty fields retain the discard confirmation');
        document.querySelector('[name="priority"]').click(); await delay();
        submit(); submit(); await delay();
        check(salesSaves === 1, 'Sales duplicate submission is blocked while saving');
        check(savedValues.customerName === 'Customer A' && savedValues.priority === 'true', 'Sales text and checkbox changes preserve trimmed submitted values');
        cancel(); await delay();
        check(salesCloses === 0, 'Sales pending submission prevents dismissal');
        finishSave(); await delay();
        cancel(); await delay();
        check(salesCloses === 1 && confirmations === 1, 'Sales successful save clears the dirty guard');
        return checks;
      })();
    `, loader: 'tsx', resolveDir: path.join(root, 'apps/web') },
    bundle: true, write: false, format: 'iife', platform: 'browser', jsx: 'automatic',
    tsconfig: path.join(root, 'apps/web/tsconfig.json'),
    alias: { react: path.join(root, 'apps/web/node_modules/react') },
    plugins: [{ name: 'native-test-adapter', setup(build) {
      build.onResolve({ filter: /^(react-native|react-i18next)$|(^|\/)(app-text|theme)$/ }, (args) => ({ path: args.path.split('/').at(-1), namespace: 'native-test' }));
      build.onLoad({ filter: /.*/, namespace: 'native-test' }, ({ path: module }) => ({
        resolveDir: path.join(root, 'apps/web'), loader: 'tsx', contents: module === 'react-native' ? `
          import React, { forwardRef } from 'react';
          export const StyleSheet = { create: value => value };
          export const AccessibilityInfo = { announceForAccessibility() {} };
          export const View = forwardRef(({ children }, ref) => <div ref={ref}>{children}</div>);
          export const TextInput = ({ value, onChangeText, onBlur, editable, accessibilityLabel }) => <input aria-label={accessibilityLabel} value={value} readOnly={editable === false} onChange={event => onChangeText?.(event.target.value)} onBlur={onBlur} />;
        ` : module === 'react-i18next' ? `
          export const useTranslation = () => ({ t: (key, options) => key === 'validation.required' ? options.field + ' is required.' : key === 'validation.email' ? 'Enter a valid email address.' : key });
        ` : module === 'app-text' ? `
          import React from 'react';
          export const AppText = ({ children, accessibilityRole }) => <span role={accessibilityRole}>{children}</span>;
          export const useLocalizedFontFamily = () => 'Arial';
        ` : `
          export const mobileText = { label: {}, caption: {} };
          export const mobileTheme = { typography: { size: { md: 16 } }, spacing: { 2: 8, 3: 12, 4: 16 }, radius: { md: 8 }, color: { text: { primary: '#111', muted: '#777' }, status: { danger: { foreground: '#d32f2f', background: '#fee' } } }, component: { field: { background: '#fff', border: '#ccc', radius: 8, height: 44 } } };
        `,
      }));
    } }],
  });
  const server = http.createServer((req, res) => {
    if (req.url === '/test.js') { res.setHeader('Content-Type', 'application/javascript'); res.end(bundle.outputFiles[0].text); }
    else res.end('<!doctype html><div id="root"></div><script src="/test.js"></script>');
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const binary = process.env.BROWSER_BINARY || [
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
    '/usr/bin/chromium', '/usr/bin/google-chrome',
  ].find((candidate) => fs.existsSync(candidate));
  assert.ok(binary, 'Set BROWSER_BINARY to an installed Chromium browser');
  const browser = spawn(binary, ['--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check', '--remote-debugging-port=0', `--user-data-dir=${directory}/profile`, 'about:blank'], { windowsHide: true, stdio: ['ignore', 'ignore', 'pipe'] });
  let socket;
  try {
    const endpoint = await new Promise((resolve, reject) => {
      let output = '';
      const timer = setTimeout(() => reject(new Error('Browser startup timed out')), 20000);
      browser.stderr.on('data', (data) => {
        output += data;
        const match = output.match(/DevTools listening on (ws:\/\/\S+)/);
        if (match) { clearTimeout(timer); resolve(match[1]); }
      });
      browser.on('error', reject);
      browser.on('exit', (code) => { clearTimeout(timer); reject(new Error(`Browser exited: ${code}`)); });
    });
    socket = new WebSocket(endpoint);
    await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject; });
    let id = 0;
    const requests = new Map();
    socket.onmessage = ({ data }) => { const value = JSON.parse(data); if (value.method === 'Runtime.exceptionThrown') console.error(JSON.stringify(value.params.exceptionDetails)); if (value.id) { requests.get(value.id)?.(value); requests.delete(value.id); } };
    async function call(method, params = {}, sessionId) {
      const requestId = ++id;
      const response = new Promise((resolve) => requests.set(requestId, resolve));
      socket.send(JSON.stringify({ id: requestId, method, params, sessionId }));
      const value = await response;
      if (value.error) throw new Error(JSON.stringify(value.error));
      return value.result;
    }
    const { targetId } = await call('Target.createTarget', { url: 'about:blank' });
    const { sessionId } = await call('Target.attachToTarget', { targetId, flatten: true });
    await call('Runtime.enable', {}, sessionId);
    await call('Page.navigate', { url: `http://127.0.0.1:${server.address().port}` }, sessionId);
    let result;
    for (let attempt = 0; attempt < 50; attempt++) {
      result = await call('Runtime.evaluate', { expression: 'window.tests', awaitPromise: true, returnByValue: true }, sessionId);
      if (result.exceptionDetails) throw new Error(JSON.stringify(result.exceptionDetails));
      if (result.result.value) break;
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    assert.ok(Array.isArray(result.result.value), 'Browser tests did not finish');
    console.log(JSON.stringify({ passed: result.result.value.length, checks: result.result.value }, null, 2));
  } finally {
    socket?.close(); browser.kill(); server.close();
  }
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
