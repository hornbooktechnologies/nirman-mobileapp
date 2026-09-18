import { strict as assert } from "node:assert";
import { test } from "node:test";
import { galleryProject, galleryScope, canUpload, canReview, sameScope, recovered, fileError } from "./gallery-rules.ts";
test("effective project access rejects foreign and CUSTOM restricted projects", () => {
 const projects = [{id:"p", permissions:["gallery:read"]}, {id:"restricted",permissions:[]}];
 assert.equal(galleryProject(projects,"p")?.id,"p");
 assert.equal(galleryProject(projects,"restricted"),undefined); assert.equal(galleryProject(projects,"foreign"),undefined);
 assert.equal(canUpload(["gallery:upload"],true),true); assert.equal(canUpload(["gallery:upload"],false),false); assert.equal(canUpload([],true),false);
});
test("review requires correct action permission, pending status and another uploader", () => {
 const row={status:"PENDING",uploadedByUserId:"u"};
 assert.equal(canReview(["gallery:approve"],"v",row,"approve"),true);
 assert.equal(canReview(["gallery:approve"],"v",row,"reject"),false);
 assert.equal(canReview(["gallery:approve"],"u",row,"approve"),false);
 for (const status of ["APPROVED","REJECTED"]) assert.equal(canReview(["gallery:approve"],"v",{...row,status},"approve"),false);
});
test("user organization and project independently isolate queue and workspace", () => {
 const a={user:"u",org:"o",project:"p"};
 assert.equal(sameScope(a,{...a}),true);
 for (const field of ["user","org","project"]) { const b={...a,[field]:"foreign"}; assert.equal(sameScope(a,b),false); assert.notEqual(galleryScope(a.user,a.org,a.project),galleryScope(b.user,b.org,b.project)); }
});
test("interrupted upload recovery retains immutable identity, bytes and metadata", () => {
 const file=new Blob(["original bytes"]); const row={state:"UPLOADING",entryId:"id",idempotencyKey:"same-key",file,caption:"Original",capturedAt:"2026-09-18",attempts:2};
 const next=recovered(row); assert.equal(next.state,"FAILED"); assert.equal(next.file,file); assert.equal(next.entryId,row.entryId); assert.equal(next.idempotencyKey,row.idempotencyKey); assert.equal(next.caption,row.caption); assert.equal(next.capturedAt,row.capturedAt); assert.equal(row.state,"UPLOADING");
});
test("unsupported, empty and oversized files rejected before persistence", () => {
 for(const type of ["image/jpeg","image/png","image/webp"]) assert.equal(fileError({type,size:10*1024*1024}),"");
 for(const file of [{type:"image/gif",size:2},{type:"image/jpeg",size:0},{type:"image/png",size:10*1024*1024+1}]) assert.ok(fileError(file));
});
