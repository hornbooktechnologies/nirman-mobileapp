import { strict as assert } from "node:assert";
import { test } from "node:test";
import { totalExpensesReturn, safeFinancialReturn } from "../financial-return.ts";
test("report return retains period, source and pagination in the same project",()=>{
 const path="/projects/site/total-expenses?period=YEAR&startDate=2025-01-01&endDate=2025-12-31&source=WAGES&page=2";
 assert.equal(totalExpensesReturn(path,"site"),path);assert.equal(safeFinancialReturn(path,"site","materials"),path);
});
test("rejects foreign projects, unrelated paths and external return destinations",()=>{
 for(const value of ["/projects/other/total-expenses","//evil.example","https://evil.example","/projects/site/materials","/projects/site/total-expenses-extra","/projects/site/total-expenses#other","/projects/site/total-expenses?next=//evil.example"]) assert.equal(totalExpensesReturn(value,"site"),null);
 assert.equal(safeFinancialReturn("/projects/other/total-expenses","site","expenses"),"/projects/site/expenses");
});
