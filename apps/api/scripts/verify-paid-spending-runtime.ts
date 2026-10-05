/** Authenticated read-only smoke using the repository's short-lived JWT verification pattern. */
import * as dotenv from "dotenv";
import * as path from "node:path";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { JwtService } from "@nestjs/jwt";
import {
  moneyPaise,
  type TotalExpensesSummary,
  type TotalExpensesList,
} from "@nirman-app/shared";
import { DatabaseService } from "../src/database/database.service";
dotenv.config({
  path: path.resolve(__dirname, "../../..", ".env"),
  quiet: true,
});
const base =
  process.env.PAID_SPENDING_VERIFY_BASE_URL ?? "http://127.0.0.1:4000/api/v1";
async function main() {
  const db = new DatabaseService();
  try {
    const rows =
      await db.query(`SELECT u.id userId,u.email,u.roleId,om.organization_id org,p.id project FROM organization_members om
   INNER JOIN user u ON u.id=om.user_id AND u.isActive=1
   INNER JOIN role r ON r.id=om.role_id AND r.name IN ('Organization Owner','Independent Contractor Owner')
   INNER JOIN projects p ON p.organization_id=om.organization_id AND p.status='ACTIVE'
   WHERE om.status='ACTIVE' AND om.organization_wide_project_access=1 LIMIT 1`);
    assert.ok(rows[0], "No existing active owner/project fixture");
    const context = rows[0];
    assert.ok(process.env.JWT_SECRET, "JWT_SECRET required");
    const token = new JwtService({ secret: process.env.JWT_SECRET }).sign(
      {
        sub: String(context.userId),
        email: String(context.email),
        roleId: String(context.roleId),
      },
      { expiresIn: "5m" },
    );
    const headers = { Authorization: `Bearer ${token}` };
    const route = `${base}/organizations/${context.org}/projects/${context.project}/total-expenses`;
    const get = async (url: string, status = 200, authorized = true) => {
      const r = await fetch(url, { headers: authorized ? headers : {} });
      const body = (await r.json()) as {
        data?: unknown;
        error?: { code?: string };
      };
      assert.equal(
        r.status,
        status,
        `Unexpected HTTP ${r.status}: ${body.error?.code ?? "no code"}`,
      );
      return body.data;
    };
    const summary = (await get(route + "/summary")) as TotalExpensesSummary;
    assert.equal(
      moneyPaise(summary.totalPaid),
      moneyPaise(summary.wagesPaid) +
        moneyPaise(summary.materialsPaid) +
        moneyPaise(summary.siteExpensesPaid),
    );
    assert.equal(
      moneyPaise(summary.totalPaid),
      summary.months.reduce((sum, m) => sum + moneyPaise(m.totalPaid), 0n),
    );
    const list = (await get(route + "?pageSize=100")) as TotalExpensesList;
    assert.equal(
      new Set(list.items.map((i) => i.source + ":" + i.id)).size,
      list.items.length,
    );
    if (list.pagination.total <= 100)
      assert.equal(
        list.items.reduce((sum, i) => sum + moneyPaise(i.periodPaidAmount), 0n),
        moneyPaise(summary.totalPaid),
      );
    const category = (await get(
      route + "?source=MATERIALS",
    )) as TotalExpensesList;
    assert.ok(category.items.every((i) => i.source === "MATERIALS"));
    await get(route + "?startDate=2026-09-01", 400);
    await get(route + "?startDate=2026-02-30&endDate=2026-03-01", 400);
    await get(route + "?pageSize=101", 400);
    await get(route + "/summary", 401, false);
    const foreign = route.replace(String(context.org), randomUUID());
    const denied = await fetch(foreign, { headers });
    assert.ok(
      [403, 404].includes(denied.status),
      "Foreign organization denied",
    );
    console.log(
      "Authenticated owner report smoke passed: totals/month/card reconciliation, category, date/page validation, signed-out and foreign-scope denial. No mutations, login/refresh writes or financial amounts printed.",
    );
  } finally {
    await db.onModuleDestroy();
  }
}
void main().catch((e: unknown) => {
  console.error(e instanceof Error ? e.message : "Runtime smoke failed");
  process.exitCode = 1;
});
