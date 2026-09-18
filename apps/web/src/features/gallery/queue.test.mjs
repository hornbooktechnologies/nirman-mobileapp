import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import ts from "typescript";
import { sameScope, recovered } from "./gallery-rules.ts";
function storage() {
 const rows=new Map(); let fail=false;
 const db={close(){},transaction(){const tx={};tx.objectStore=()=>({
 getAll(){return request([...rows.values()]);},put(row){return request(row.entryId,()=>rows.set(row.entryId,row));},delete(id){return request(undefined,()=>rows.delete(id));},clear(){return request(undefined,()=>rows.clear());}
 });function request(result,commit=()=>{}){const req={result};queueMicrotask(()=>{if(fail)tx.onabort?.();else{commit();tx.oncomplete?.();}});return req;}return tx;}};
 globalThis.indexedDB={open(){const req={result:db};queueMicrotask(()=>req.onsuccess());return req;},deleteDatabase(){rows.clear();}};
 globalThis.window=new EventTarget();
 const source=readFileSync(new URL("./queue.ts",import.meta.url),"utf8");
 const {outputText}=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}});
 const exports={};new Function("require","exports",outputText)(()=>({sameScope,recovered}),exports);
 return {queue:exports,rows,setFail(value){fail=value;}};
}
test("queue transactions preserve Blob and hide other users/projects; interrupted restart can replay",async()=>{
 const {queue}=storage();const a={user:"u",org:"o",project:"p"};const row={...a,entryId:"a",idempotencyKey:"stable",file:new Blob(["private"]),state:"UPLOADING"};
 await queue.savePhoto(row);await queue.savePhoto({...row,user:"other",entryId:"b"});await queue.savePhoto({...row,project:"other",entryId:"c"});
 const read=await queue.readQueue(a);assert.equal(read.length,1);assert.equal(read[0].state,"FAILED");assert.equal(read[0].idempotencyKey,"stable");assert.equal(await read[0].file.text(),"private");
 await queue.removePhoto("a");assert.deepEqual(await queue.readQueue(a),[]);
});
test("quota/transaction abort rejects persistence rather than claiming queued success",async()=>{
 const {queue,rows,setFail}=storage();setFail(true);await assert.rejects(queue.savePhoto({entryId:"a"}),/storage may be full/);assert.equal(rows.size,0);
});
test("sign-out invalidates pending writes and clears all sensitive stored photos",async()=>{
 const {queue,rows}=storage();await queue.savePhoto({entryId:"existing"});let notified=false;window.addEventListener("gallery-session-cleared",()=>{notified=true;});
 const late=queue.savePhoto({entryId:"late"});queue.clearGalleryQueue();await assert.rejects(late,/Session changed/);await new Promise(resolve=>setImmediate(resolve));assert.equal(rows.size,0);assert.equal(notified,true);
});
