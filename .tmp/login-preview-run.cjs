const fs = require("fs"),
  path = require("path"),
  http = require("http");
const toolsRoot = process.env.DASHBOARD_PREVIEW_TOOLS;
if (!toolsRoot)
  throw new Error(
    "Set DASHBOARD_PREVIEW_TOOLS to the node_modules directory containing esbuild and playwright.",
  );
const esbuild = require(path.join(toolsRoot, "esbuild"));
const { chromium } = require(path.join(toolsRoot, "playwright"));
const mobile = path.resolve("apps/mobile");
const out = path.resolve(".tmp/login-render");
const artifacts = path.resolve("docs/tasks/artifacts/login-redesign");
fs.mkdirSync(out, { recursive: true });
fs.mkdirSync(artifacts, { recursive: true });
(async () => {
  await esbuild.build({
    entryPoints: [".tmp/login-preview.tsx"],
    bundle: true,
    outfile: path.join(out, "preview.js"),
    platform: "browser",
    format: "iife",
    jsx: "automatic",
    mainFields: ["browser", "module", "main"],
    nodePaths: [path.join(mobile, "node_modules")],
    alias: {
      "react-native-svg": path.join(
        mobile,
        "node_modules/react-native-svg/lib/module/ReactNativeSVG.web.js",
      ),
      "react-native": path.join(mobile, "node_modules/react-native-web"),
    },
    define: { process: JSON.stringify({env:{}}),
      "process.env.NODE_ENV": '"development"',
      "process.env.EXPO_OS": '"web"',
      global: "globalThis",
      __DEV__: "true",
    },
    resolveExtensions: [
      ".web.tsx",
      ".web.ts",
      ".web.js",
      ".tsx",
      ".ts",
      ".js",
      ".json",
    ],
    loader: { ".js": "jsx", ".ttf": "file", ".png": "file" },
    plugins: [
      {
        name: "local-fixtures",
        setup(build) {
          build.onResolve({filter: /^expo-router$/},()=>({path:'router-mock',namespace:'auth-fixture'}));
          build.onResolve({filter: /^\.\.\/\.\.\/\.\.\/providers$/},()=>({path:'session-mock',namespace:'auth-fixture'}));
          build.onResolve({filter: /components\/ui$/},()=>({path:'ui-mock',namespace:'auth-fixture'}));
          build.onLoad({filter: /.*/,namespace:'auth-fixture'}, args=>({resolveDir:process.cwd(),loader:'js',contents:args.path==='router-mock' ? "export const router={replace:p=>window.__route=p,push:p=>window.__route=p};export const useLocalSearchParams=()=>({});" : args.path==='session-mock' ? "export const useSession=()=>({signIn:()=>{window.__calls=(window.__calls||0)+1;return new Promise((resolve,reject)=>{window.__resolve=resolve;window.__reject=()=>reject(new Error('Fixture sign-in failure'));});}});" : ['app-text','button','form-field','glass-card','input','language-picker'].map(f=>`export * from './apps/mobile/src/components/ui/${f}';`).join('\n')}));
          build.onResolve({ filter: /localization-provider$/ }, () => ({
            path: "fixture-localization",
            namespace: "fixture",
          }));
          build.onLoad({ filter: /.*/, namespace: "fixture" }, () => ({
            contents:
              "export const useLocalization=()=>({language:new URLSearchParams(location.search).get('lang')||'en',preference:new URLSearchParams(location.search).get('lang')||'en',setLanguagePreference:async()=>{}});",
            loader: "js",
          }));
          build.onLoad({ filter: /\.png$/ }, async (args) => {
            const png = fs.readFileSync(args.path);
            const meta = {
              width: png.readUInt32BE(16),
              height: png.readUInt32BE(20),
            };
            const name =
              path.basename(path.dirname(args.path)) +
              "-" +
              path.basename(args.path);
            fs.copyFileSync(args.path, path.join(out, name));
            return {
              contents: `module.exports={uri:${JSON.stringify("/" + name)},width:${meta.width},height:${meta.height}};`,
              loader: "js",
            };
          });
        },
      },
    ],
  });
  const fontNames = {
    Manrope: ["Regular", "Medium", "SemiBold", "Bold"],
    NotoSansDevanagari: ["Regular", "Medium", "SemiBold", "Bold"],
    NotoSansGujarati: ["Regular", "Medium", "SemiBold", "Bold"],
  };
  let css = "";
  for (const [family, weights] of Object.entries(fontNames))
    for (let i = 0; i < weights.length; i++) {
      const file = family + "-" + weights[i] + ".ttf";
      fs.copyFileSync(
        path.join(mobile, "assets/fonts", file),
        path.join(out, file),
      );
      css += `@font-face{font-family:'${family}_${[400, 500, 600, 700][i]}${weights[i]}';src:url('/${file}')} `;
    }
  fs.writeFileSync(
    path.join(out, "index.html"),
    `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>html,body,#root{margin:0;height:100%}#root{display:flex;flex-direction:column}*{box-sizing:border-box}${css}</style></head><body><div id="root"></div><script src="/preview.js"></script></body></html>`,
  );
  const server = http.createServer((req, res) => {
    const filename = req.url.split("?")[0];
    const file = path.join(out, filename === "/" ? "index.html" : filename);
    if (!file.startsWith(out) || !fs.existsSync(file)) {
      res.writeHead(404);
      return res.end();
    }
    res.setHeader(
      "Content-Type",
      file.endsWith(".js")
        ? "text/javascript"
        : file.endsWith(".png")
          ? "image/png"
          : file.endsWith(".ttf")
            ? "font/ttf"
            : "text/html",
    );
    res.end(fs.readFileSync(file));
  });
  await new Promise((resolve) => server.listen(8769, "127.0.0.1", resolve));
  const browser = await chromium.launch({ channel: "msedge", headless: true });
  const report=[];
  try {
    for (const language of ['en','hi','gu']) for (const width of [320,375,425]) {
      const page=await browser.newPage({viewport:{width,height:850},reducedMotion:'reduce'});
      const errors=[];page.on('pageerror',e=>{errors.push(e.message);console.error(e.message)});
      await page.goto('http://127.0.0.1:8769/?lang='+language);
      await page.locator('input').first().waitFor();await page.evaluate(()=>document.fonts.ready);
      await page.screenshot({path:path.join(artifacts,`login-${width}-${language}.png`),fullPage:true});
      await page.locator('input').nth(0).fill('preview@example.test');
      await page.locator('input').nth(1).fill('fixture-only');
      const buttons=page.getByRole('button');const submit=buttons.nth(0);
      await submit.click();
      await page.waitForFunction(()=>window.__calls===1);
      const disabled=await submit.getAttribute('aria-disabled');
      const busy=await submit.getAttribute('aria-busy');
      await page.locator('input').nth(1).press('Enter');
      await page.evaluate(()=>document.querySelector('[role="button"]').click());
      const calls=await page.evaluate(()=>window.__calls);
      if(language==='en' && width===375)await page.screenshot({path:path.join(artifacts,'login-loading.png'),fullPage:true});
      await page.evaluate(()=>window.__reject());
      await page.waitForFunction(()=>document.querySelector('[role="button"]').getAttribute('aria-disabled')!=='true');
      const passwordRetained=await page.locator('input').nth(1).inputValue()==='fixture-only';
      await submit.click();await page.waitForFunction(()=>window.__calls===2);await page.evaluate(()=>window.__resolve());await page.waitForFunction(()=>window.__route==='/(app)/dashboard');
      const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth);
      report.push({language,width,errors,disabled,busy,calls,passwordRetained,overflow});
      await page.close();
    }
    console.log(JSON.stringify(report));
    fs.writeFileSync(path.join(artifacts,'verification.json'),JSON.stringify(report,null,2));
    if(report.some(r=>r.errors.length||r.disabled!=='true'||r.busy!=='true'||r.calls!==1||!r.passwordRetained||r.overflow))process.exitCode=1;
  } finally {await browser.close();server.close();}
})().catch(e=>{console.error(e);process.exit(1);});
