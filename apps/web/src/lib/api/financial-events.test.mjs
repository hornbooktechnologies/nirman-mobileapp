import assert from "node:assert/strict";
import {test} from "node:test";
import {readFileSync} from "node:fs";
import ts from "typescript";
const source=ts.transpileModule(readFileSync(new URL("./financial-events.ts",import.meta.url),"utf8"),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText;
const exports={};new Function("exports",source)(exports);
test("only successful financial mutation scopes identify affected project",()=>{
 for(const module of ["materials","expenses","wages"]) assert.deepEqual(exports.financialMutationScope(`/organizations/org/projects/project/${module}/source/payments`,"POST"),{organizationId:"org",projectId:"project"});
 assert.equal(exports.financialMutationScope("/organizations/org/projects/project/expenses","GET"),null);
 assert.equal(exports.financialMutationScope("/auth/refresh","POST"),null);
 assert.equal(exports.financialMutationScope("/organizations/org/projects/project/expenses-other","POST"),null);
});
