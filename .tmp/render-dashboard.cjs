const fs=require('fs'),path=require('path'),http=require('http');
const toolsRoot='C:/Users/admin/AppData/Local/pnpm-cache/dlx/dde1138dc2208d3c80792dd7e56090b9/pkg/node_modules';
const esbuild=require(path.join(toolsRoot,'esbuild'));
const {chromium}=require(path.join(toolsRoot,'playwright'));
const mobile=path.resolve('apps/mobile');
const out=path.resolve('.tmp/dashboard-render');
const artifacts=path.resolve('docs/tasks/artifacts/dashboard-redesign');
fs.mkdirSync(out,{recursive:true});fs.mkdirSync(artifacts,{recursive:true});
(async()=>{
 await esbuild.build({entryPoints:['.tmp/dashboard-preview.tsx'],bundle:true,outfile:path.join(out,'preview.js'),platform:'browser',format:'iife',jsx:'automatic',mainFields:['browser','module','main'],nodePaths:[path.join(mobile,'node_modules')],alias:{'react-native-svg':path.join(mobile,'node_modules/react-native-svg/lib/module/ReactNativeSVG.web.js'),'react-native':path.join(mobile,'node_modules/react-native-web')},define:{'process.env.NODE_ENV':'"development"','process.env.EXPO_OS':'"web"','global':'globalThis','__DEV__':'true'},resolveExtensions:['.web.tsx','.web.ts','.web.js','.tsx','.ts','.js','.json'],loader:{'.js':'jsx','.ttf':'file','.png':'file'},plugins:[{name:'local-fixtures',setup(build){
  build.onResolve({filter:/localization-provider$/},()=>({path:'fixture-localization',namespace:'fixture'}));
  build.onLoad({filter:/.*/,namespace:'fixture'},()=>({contents:"export const useLocalization=()=>({language:new URLSearchParams(location.search).get('lang')||'en'});",loader:'js'}));
  build.onLoad({filter:/\.png$/},async args=>{const sharp=require('../node_modules/.pnpm/sharp@0.34.5/node_modules/sharp');const meta=await sharp(args.path).metadata();const name=path.basename(path.dirname(args.path))+'-'+path.basename(args.path);fs.copyFileSync(args.path,path.join(out,name));return {contents:`module.exports={uri:${JSON.stringify('/'+name)},width:${meta.width},height:${meta.height}};`,loader:'js'};});
 }}]});
 const fontNames={Manrope:['Regular','Medium','SemiBold','Bold'],NotoSansDevanagari:['Regular','Medium','SemiBold','Bold'],NotoSansGujarati:['Regular','Medium','SemiBold','Bold']};let css='';
 for(const [family,weights]of Object.entries(fontNames))for(let i=0;i<weights.length;i++){const file=family+'-'+weights[i]+'.ttf';fs.copyFileSync(path.join(mobile,'assets/fonts',file),path.join(out,file));css+=`@font-face{font-family:'${family}_${[400,500,600,700][i]}${weights[i]}';src:url('/${file}')} `;}
 fs.writeFileSync(path.join(out,'index.html'),`<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>html,body{margin:0}*{box-sizing:border-box}${css}</style></head><body><div id="root"></div><script src="/preview.js"></script></body></html>`);
 const server=http.createServer((req,res)=>{const filename=req.url.split('?')[0];const file=path.join(out,filename==='/'?'index.html':filename);if(!file.startsWith(out)||!fs.existsSync(file)){res.writeHead(404);return res.end();}res.setHeader('Content-Type',file.endsWith('.js')?'text/javascript':file.endsWith('.png')?'image/png':file.endsWith('.ttf')?'font/ttf':'text/html');res.end(fs.readFileSync(file));});
 await new Promise(resolve=>server.listen(8769,'127.0.0.1',resolve));
 const browser=await chromium.launch({channel:'msedge',headless:true});const report=[];
 try{for(const language of ['en','hi','gu'])for(const width of [320,375,425]){
  const page=await browser.newPage({viewport:{width,height:900},deviceScaleFactor:1,reducedMotion:'reduce'});const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto('http://127.0.0.1:8769/?lang='+language);await page.waitForSelector('[role="tab"]');await page.evaluate(()=>document.fonts.ready);await page.waitForTimeout(700);
  const overflow=await page.evaluate(()=>({viewport:innerWidth,scroll:document.documentElement.scrollWidth,offenders:[...document.querySelectorAll('[role="button"],[role="tab"]')].map(e=>({label:e.getAttribute('aria-label'),rect:e.getBoundingClientRect().toJSON()})).filter(x=>x.rect.x<0||x.rect.right>innerWidth||x.rect.height<50)}));
  await page.screenshot({path:path.join(artifacts,`dashboard-${width}-${language}.png`),fullPage:true});
  const tabs=page.getByRole('tab');await tabs.nth(1).click();const actionsSelected=await tabs.nth(1).getAttribute('aria-selected');await tabs.nth(2).click();const attentionSelected=await tabs.nth(2).getAttribute('aria-selected');
  if(language==='en')await page.screenshot({path:path.join(artifacts,`dashboard-${width}-attention.png`),fullPage:true});
  report.push({language,width,...overflow,errors,actionsSelected,attentionSelected});await page.close();
 }
 fs.writeFileSync(path.join(artifacts,'verification.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report));
 if(report.some(r=>r.errors.length||r.scroll>r.viewport||r.offenders.length||r.actionsSelected!=='true'||r.attentionSelected!=='true'))process.exitCode=1;
 }finally{await browser.close();server.close();}
})().catch(e=>{console.error(e);process.exit(1)});
