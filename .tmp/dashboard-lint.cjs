const path=require('path');
const {ESLint}=require('../apps/web/node_modules/eslint');
const apiRequire=require('module').createRequire(path.resolve('apps/api/package.json'));
const parser=apiRequire('typescript-eslint').parser;
const plugin=apiRequire('typescript-eslint').plugin;
(async()=>{const eslint=new ESLint({overrideConfigFile:true,overrideConfig:[{files:['**/*.ts','**/*.tsx'],languageOptions:{parser,parserOptions:{ecmaVersion:'latest',sourceType:'module',ecmaFeatures:{jsx:true}}},plugins:{'@typescript-eslint':plugin},rules:{'@typescript-eslint/no-unused-vars':['error',{argsIgnorePattern:'^_'}],'no-constant-condition':'error','no-unreachable':'error'}}]});const results=await eslint.lintFiles(['apps/mobile/src/features/home/components/Dashboard','apps/mobile/src/features/projects/components/project-switcher.tsx','apps/mobile/src/components/ui/nirman-screen-background.tsx','apps/mobile/src/features/home/customer-screens.tsx']);console.log(await (await eslint.loadFormatter('stylish')).format(results));console.log('Focused ESLint: '+results.reduce((sum,r)=>sum+r.errorCount,0)+' errors');if(results.some(r=>r.errorCount))process.exitCode=1;})();
