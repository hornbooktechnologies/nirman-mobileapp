/** Executes only SELECT queries against inline fixtures; does not create tables or touch financial rows. */
import * as dotenv from "dotenv";
import * as path from "node:path";
import assert from "node:assert/strict";
import type { RowDataPacket } from "mysql2/promise";
import { DatabaseService } from "../src/database/database.service";
import type {
  DatabaseConnection,
  QueryParams,
} from "../src/database/database.types";
import { TotalExpensesRepository } from "../src/modules/total-expenses/total-expenses.repository";
import { TotalExpensesQueryDto } from "../src/modules/total-expenses/total-expenses.dto";
dotenv.config({
  path: path.resolve(__dirname, "../../..", ".env"),
  quiet: true,
});
// Every source table is substituted with an inline SELECT fixture. No persisted data is used.
const fixtures = `WITH
wage_batches AS (
 SELECT 'batch' id,'fixture-org' organization_id,'fixture-project' project_id,'2026-09-01' period_start,'2026-09-30' period_end,'PARTIALLY_PAID' status
 UNION ALL SELECT 'cancelled','fixture-org','fixture-project','2026-09-01','2026-09-30','CANCELLED'
 UNION ALL SELECT 'draft','fixture-org','fixture-project','2026-09-01','2026-09-30','DRAFT'
),
wage_items AS (
 SELECT 'item' id,'batch' wage_batch_id,'fixture-org' organization_id,'fixture-project' project_id,CAST(150 AS DECIMAL(14,2)) net_amount
 UNION ALL SELECT 'cancelled-item','cancelled','fixture-org','fixture-project',20
 UNION ALL SELECT 'draft-item','draft','fixture-org','fixture-project',20
),
wage_payments AS (
 SELECT 'wp1' id,'item' wage_item_id,'batch' wage_batch_id,'fixture-org' organization_id,'fixture-project' project_id,CAST(30 AS DECIMAL(14,2)) amount,'2026-09-10' payment_date
 UNION ALL SELECT 'wp2','item','batch','fixture-org','fixture-project',20,'2026-09-20'
 UNION ALL SELECT 'wp3','item','batch','fixture-org','fixture-project',40,'2026-10-20'
 UNION ALL SELECT 'wp4','cancelled-item','cancelled','fixture-org','fixture-project',20,'2026-09-20'
 UNION ALL SELECT 'wp5','draft-item','draft','fixture-org','fixture-project',20,'2026-09-20'
),
material_requests AS (
 SELECT 'request' id,'fixture-org' organization_id,'fixture-project' project_id,'Cement' material_name,'PARTIALLY_DELIVERED' status,'BAG' unit_of_measure,NULL custom_unit_label,CAST(10 AS DECIMAL(14,3)) requested_quantity,CAST(100 AS DECIMAL(14,2)) estimated_cost,'2026-08-01' requested_on
 UNION ALL SELECT 'example','fixture-org','fixture-project','50 bag example','PARTIALLY_DELIVERED','BAG',NULL,50,5000,'2026-10-01'
 UNION ALL SELECT 'unpriced','fixture-org','fixture-project','Unknown cost','ORDERED','OTHER','Box',2,NULL,'2026-10-02'
 UNION ALL SELECT 'unpaid-request','fixture-org','fixture-project','Request only','DRAFT','BAG',NULL,5,NULL,'2026-10-03'
 UNION ALL SELECT 'foreign-request','other-org','other-project','Foreign','DRAFT','BAG',NULL,999,999,'2026-10-04'
),
material_purchases AS (
 SELECT 'purchase' id,'request' material_request_id,'fixture-org' organization_id,'fixture-project' project_id,'Vendor' vendor_name,'2026-08-01' purchased_on,CAST(100 AS DECIMAL(14,2)) total_cost,CAST(10 AS DECIMAL(14,3)) ordered_quantity
 UNION ALL SELECT 'example-purchase','example','fixture-org','fixture-project','Vendor','2026-10-01',3000,30
 UNION ALL SELECT 'unpriced-purchase','unpriced','fixture-org','fixture-project','Vendor','2026-10-02',NULL,1
 UNION ALL SELECT 'priced-purchase','unpriced','fixture-org','fixture-project','Vendor','2026-10-02',50,1
 UNION ALL SELECT 'foreign-purchase','example','other-org','other-project','Foreign','2026-10-01',999,999
),
material_deliveries AS (
 SELECT 'request' material_request_id,'fixture-org' organization_id,'fixture-project' project_id,CAST(4 AS DECIMAL(14,3)) delivered_quantity
 UNION ALL SELECT 'request','fixture-org','fixture-project',2
 UNION ALL SELECT 'example','fixture-org','fixture-project',10
 UNION ALL SELECT 'example','fixture-org','fixture-project',10
 UNION ALL SELECT 'example','other-org','other-project',999
),
material_purchase_payments AS (
 SELECT 'mp1' id,'purchase' material_purchase_id,'fixture-org' organization_id,'fixture-project' project_id,CAST(10 AS DECIMAL(14,2)) amount,'2026-09-12' payment_date
 UNION ALL SELECT 'mp2','purchase','fixture-org','fixture-project',20,'2026-09-18'
 UNION ALL SELECT 'mp3','purchase','fixture-org','fixture-project',30,'2026-10-01'
 UNION ALL SELECT 'foreign','purchase','other-org','other-project',999,'2026-09-20'
),
material_purchase_payments_voids AS (SELECT 'void' id,'mp2' payment_id),
site_expenses AS (
 SELECT 'expense' id,'fixture-org' organization_id,'fixture-project' project_id,'Truck rent' description,'Payee' vendor_payee,'TRANSPORT' category,'2026-08-01' expense_date,CAST(60 AS DECIMAL(14,2)) amount,'APPROVED' status
 UNION ALL SELECT 'pending','fixture-org','fixture-project','Unapproved','Payee','TOOLS','2026-09-01',5,'PENDING_APPROVAL'
),
site_expense_adjustments AS (SELECT 'expense' site_expense_id,CAST(10 AS DECIMAL(14,2)) amount),
site_expense_payments AS (
 SELECT 'ep1' id,'expense' site_expense_id,'fixture-org' organization_id,'fixture-project' project_id,CAST(20 AS DECIMAL(14,2)) amount,'2026-09-22' payment_date
 UNION ALL SELECT 'ep2','expense','fixture-org','fixture-project',30,'2026-10-10'
 UNION ALL SELECT 'ep3','pending','fixture-org','fixture-project',5,'2026-09-01'
),
site_expense_payments_voids AS (SELECT 'never-voided' id,'never-paid' payment_id)
`;
// Inline derived tables also support older MySQL deployments without CTE support.
const definitions = new Map<string, string>();
for (const match of fixtures.matchAll(/(\w+) AS \(/g)) {
  const start = match.index + match[0].length;
  let depth = 1;
  let end = start;
  while (depth > 0 && end < fixtures.length) {
    if (fixtures[end] === "(") depth++;
    if (fixtures[end] === ")") depth--;
    end++;
  }
  definitions.set(match[1], fixtures.slice(start, end - 1));
}
const sourceTables = new RegExp(
  `\\b(FROM|JOIN)\\s+(${[...definitions.keys()].join("|")})\\b`,
  "g",
);
class FixtureDatabase extends DatabaseService {
  override query<T extends RowDataPacket>(
    sql: string,
    params: QueryParams = [],
    connection?: DatabaseConnection,
  ): Promise<T[]> {
    assert.match(sql.trim(), /^SELECT /);
    return super.query<T>(
      sql.replace(
        sourceTables,
        (_match: string, keyword: string, name: string) =>
          `${keyword} (${definitions.get(name)!})`,
      ),
      params,
      connection,
    );
  }
}
async function main() {
  const db = new FixtureDatabase();
  try {
    const repo = new TotalExpensesRepository(db);
    const query = (values: Partial<TotalExpensesQueryDto> = {}) =>
      Object.assign(new TotalExpensesQueryDto(), values);
    const september = query({ startDate: "2026-09-01", endDate: "2026-09-30" });
    const s = await repo.summary("fixture-org", "fixture-project", september);
    assert.deepEqual(
      [s.totalPaid, s.wagesPaid, s.materialsPaid, s.siteExpensesPaid],
      ["80.00", "50.00", "10.00", "20.00"],
    );
    const list = await repo.list("fixture-org", "fixture-project", september);
    assert.equal(list.pagination.total, 3);
    assert.equal(list.items.length, 3);
    const wage = list.items.find((i) => i.source === "WAGES")!;
    assert.deepEqual(
      [wage.periodPaidAmount, wage.lifetimePaidAmount, wage.remainingAmount],
      ["50.00", "90.00", "60.00"],
    );
    const material = list.items.find((i) => i.source === "MATERIALS")!;
    assert.deepEqual(
      [
        material.periodPaidAmount,
        material.lifetimePaidAmount,
        material.remainingAmount,
      ],
      ["10.00", "40.00", "60.00"],
    );
    const expense = list.items.find((i) => i.source === "SITE_EXPENSES")!;
    assert.deepEqual(
      [
        expense.periodPaidAmount,
        expense.lifetimePaidAmount,
        expense.remainingAmount,
      ],
      ["20.00", "50.00", "20.00"],
    );
    const october = await repo.summary(
      "fixture-org",
      "fixture-project",
      query({ startDate: "2026-10-01", endDate: "2026-10-31" }),
    );
    assert.equal(october.totalPaid, "100.00");
    const all = await repo.summary("fixture-org", "fixture-project", query());
    assert.equal(all.totalPaid, "180.00");
    assert.deepEqual(
      all.months.map((m) => [m.month, m.totalPaid]),
      [
        ["2026-09", "80.00"],
        ["2026-10", "100.00"],
      ],
    );
    const only = await repo.list(
      "fixture-org",
      "fixture-project",
      query({ ...september, source: "MATERIALS" }),
    );
    assert.equal(only.items.length, 1);
    assert.equal(only.items[0].source, "MATERIALS");
    const first = await repo.list(
      "fixture-org",
      "fixture-project",
      query({ ...september, pageSize: 1 }),
    );
    const second = await repo.list(
      "fixture-org",
      "fixture-project",
      query({ ...september, pageSize: 1, page: 2 }),
    );
    assert.equal(first.pagination.total, 3);
    assert.notEqual(first.items[0].id, second.items[0].id);
    const boundary = await repo.summary(
      "fixture-org",
      "fixture-project",
      query({ startDate: "2026-09-20", endDate: "2026-09-20" }),
    );
    assert.equal(boundary.totalPaid, "20.00");
    const empty = await repo.list("other-org", "other-project", query());
    assert.equal(empty.pagination.total, 0);
    const overview = await repo.materials(
      "fixture-org",
      "fixture-project",
      september,
    );
    assert.equal(overview.pagination.total, 4);
    const example = overview.materials.find((i) => i.id === "example")!;
    assert.deepEqual(
      [
        example.requestedQuantity,
        example.orderedQuantity,
        example.deliveredQuantity,
        example.awaitingDeliveryQuantity,
        example.unorderedQuantity,
        example.estimatedCost,
        example.orderCost,
        example.lifetimePaidAmount,
        example.remainingAmount,
      ],
      [
        "50.000",
        "30.000",
        "20.000",
        "10.000",
        "20.000",
        "5000.00",
        "3000.00",
        "0.00",
        "3000.00",
      ],
    );
    const unknown = overview.materials.find((i) => i.id === "unpriced")!;
    assert.equal(unknown.orderCost, null);
    assert.equal(unknown.remainingAmount, null);
    assert.equal(unknown.unpricedPurchaseCount, 1);
    const requestOnly = overview.materials.find(
      (i) => i.id === "unpaid-request",
    )!;
    assert.equal(Number(requestOnly.orderCost), 0);
    assert.equal(Number(requestOnly.unorderedQuantity), 5);
    const paidMaterial = overview.materials.find((i) => i.id === "request")!;
    assert.equal(paidMaterial.lifetimePaidAmount, "40.00");
    assert.equal(paidMaterial.remainingAmount, "60.00");
    const overviewPage = await repo.materials(
      "fixture-org",
      "fixture-project",
      query({ pageSize: 1, page: 2 }),
    );
    assert.equal(overviewPage.pagination.total, 4);
    assert.equal(overviewPage.materials.length, 1);
    assert.equal(overviewPage.materials[0].id, "unpriced");
    const noScope = await repo.materials("absent", "absent", query());
    assert.equal(noScope.pagination.total, 0);
    assert.deepEqual(noScope.materials, []);
    console.log(
      "Read-only SQL fixtures passed: decimal totals, partial payments, void exclusions, scope isolation, date boundaries, grouping, pagination, monthly reconciliation and material request/order/delivery/unpriced snapshots. No persisted data changed.",
    );
  } finally {
    await db.onModuleDestroy();
  }
}
void main().catch((error: unknown) => {
  console.error(
    error instanceof Error ? error.message : "Read-only fixture check failed",
  );
  process.exitCode = 1;
});
