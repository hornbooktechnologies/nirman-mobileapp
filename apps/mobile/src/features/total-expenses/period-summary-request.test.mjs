import assert from "node:assert/strict";
import {test} from "node:test";
import {readFileSync} from "node:fs";
import ts from "typescript";
const code=ts.transpileModule(readFileSync(new URL("./period-summary-request.ts",import.meta.url),"utf8"),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
const exports={};new Function("exports",code)(exports);
test("same scoped period shares in-flight and completed summary across category/page reads",async()=>{
 const cache=new exports.PeriodSummaryRequest();let calls=0;const load=async()=>{calls++;return {total:"20.00"};};
 const one=cache.get("user:org:project:month",load);const two=cache.get("user:org:project:month",load);
 assert.equal(one,two);assert.deepEqual(await one,{total:"20.00"});await cache.get("user:org:project:month",load);assert.equal(calls,1);
 await cache.get("user:org:project:month",load,true);assert.equal(calls,2);
});
test("date/scope changes and blur abort previous work; rejected requests can retry",async()=>{
 const cache=new exports.PeriodSummaryRequest();let signal;
 await cache.get("scope1:September",async s=>{signal=s;return 1;});
 await cache.get("scope2:September",async()=>2);assert.equal(signal.aborted,true);
 await assert.rejects(cache.get("scope2:October",async()=>{throw new Error("offline");}));
 assert.equal(await cache.get("scope2:October",async()=>3),3);
 cache.cancel();assert.equal(cache.key,undefined);
});
