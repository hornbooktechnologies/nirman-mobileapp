import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import ts from "typescript";
function adapter(api) {
 const source=readFileSync(new URL("./gallery.service.ts",import.meta.url),"utf8");
 const {outputText}=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}});
 const exports={}; new Function("require","exports",outputText)((id)=>{assert.equal(id,"@/lib/api/api-client");return {api};},exports); return exports.galleryService;
}
test("uncertain upload is not automatically retried and explicit replay preserves file and identity",async()=>{
 const calls=[];const service=adapter({post:async(path,body,options)=>{calls.push({path,body,options});if(calls.length===1)throw new Error("Lost response");return {status:"APPROVED"};}});
 const row={org:"o",project:"p",entryId:"uuid",idempotencyKey:"original-key",file:new Blob(["bytes"],{type:"image/png"}),fileName:"photo.png",category:"WORK",caption:"original",capturedAt:"2026-09-18T00:00:00Z"};
 const signal=new AbortController().signal;
 await assert.rejects(service.upload(row,signal),/Lost response/);assert.equal(calls.length,1);
 assert.equal((await service.upload(row,signal)).status,"APPROVED");
 for(const call of calls){assert.equal(call.path,"/organizations/o/projects/p/gallery/entries");assert.equal(call.options.signal,signal);assert.equal(call.options.headers["Content-Type"],undefined);assert.equal(call.body.get("idempotencyKey"),"original-key");assert.equal(call.body.get("entryId"),"uuid");assert.equal(await call.body.get("file").text(),"bytes");}
});
test("private media and list use scoped authenticated transport, cancellation and supported filters",async()=>{
 const calls=[]; const service=adapter({get:async(path,options)=>{calls.push({path,options});return [];}}); const signal=new AbortController().signal;const query={page:2,pageSize:24,status:"PENDING",stage:"SLAB",dateFrom:"2026-09-01"};
 await service.list("o","p",query,signal);assert.deepEqual(calls[0],{path:"/organizations/o/projects/p/gallery/entries",options:{params:query,signal}});
 await service.media("o","p","id",signal);assert.deepEqual(calls[1],{path:"/organizations/o/projects/p/gallery/entries/id/media",options:{responseType:"blob",signal}});
});
test("review carries observed version and trimmed rejection reason",async()=>{
 let call; const service=adapter({post:async(...args)=>{call=args;}});const signal=new AbortController().signal;
 await service.review("o","p",{id:"id",version:7},"reject","  reason here  ",signal);assert.deepEqual(call,["/organizations/o/projects/p/gallery/entries/id/reject",{expectedVersion:7,reason:"reason here"},{signal}]);
});
