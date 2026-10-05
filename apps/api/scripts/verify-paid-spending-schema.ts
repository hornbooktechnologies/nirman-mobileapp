/** Read-only schema preflight/post-rollout checks. Never executes migrations or payments. */
import * as dotenv from "dotenv";
import * as path from "node:path";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import assert from "node:assert/strict";
import { DatabaseService } from "../src/database/database.service";
import { TotalExpensesRepository } from "../src/modules/total-expenses/total-expenses.repository";
import { TotalExpensesQueryDto } from "../src/modules/total-expenses/total-expenses.dto";
import {
  parseMigrationTarget,
  formatMigrationTarget,
} from "../src/database/migrations/migration-safety";

dotenv.config({
  path: path.resolve(__dirname, "../../..", ".env"),
  quiet: true,
});
const tables = [
  "material_purchase_payments",
  "material_purchase_payments_voids",
  "site_expense_payments",
  "site_expense_payments_voids",
];
const grants = [
  ["total-expenses", "read"],
  ["materials", "mark-paid"],
  ["materials", "void-payment"],
  ["expenses", "mark-paid"],
  ["expenses", "void-payment"],
];
async function main() {
  const db = new DatabaseService();
  try {
    const target = parseMigrationTarget(process.env.DATABASE_URL!);
    console.log("Target:", formatMigrationTarget(target));
    const version = await db.query("SELECT VERSION() version");
    console.log("Server:", version[0].version);
    const snapshot: Record<string, unknown> = {};
    for (const table of [
      "material_purchases",
      "site_expenses",
      "user",
      "role",
      "permission",
      "schema_migrations",
    ]) {
      snapshot[table] = await db.query(
        "SHOW CREATE TABLE " +
          String.fromCharCode(96) +
          table +
          String.fromCharCode(96),
      );
    }
    const columns = await db.query(
      `SELECT TABLE_NAME, COLUMN_NAME, COLUMN_TYPE, COLLATION_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME IN ('material_purchases','site_expenses','user') AND COLUMN_NAME IN ('id','material_request_id','organization_id','project_id')`,
    );
    for (const c of columns) {
      assert.equal(
        c.COLUMN_TYPE,
        "varchar(36)",
        `${c.TABLE_NAME}.${c.COLUMN_NAME} type`,
      );
      assert.equal(
        c.COLLATION_NAME,
        "utf8mb4_unicode_ci",
        `${c.TABLE_NAME}.${c.COLUMN_NAME} collation`,
      );
    }
    const owners = await db.query(
      "SELECT id, name FROM role WHERE name IN ('Organization Owner','Independent Contractor Owner')",
    );
    assert.ok(owners.length, "Owner roles required");
    snapshot.ownerGrants = await db.query(
      "SELECT p.* FROM permission p INNER JOIN role r ON r.id=p.roleId WHERE r.name IN ('Organization Owner','Independent Contractor Owner')",
    );
    snapshot.migrations = await db.query(
      "SELECT filename,checksum_sha256,status FROM schema_migrations ORDER BY filename",
    );
    const existing = await db.query(
      `SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME IN (?,?,?,?)`,
      tables,
    );
    const preflight = process.argv.includes("--preflight");
    if (preflight) {
      assert.equal(
        existing.length,
        0,
        "Unexpected existing payment tables; inspect before migration",
      );
      const folder = await fs.mkdtemp(
        path.join(os.tmpdir(), "nirman-paid-spending-preflight-"),
      );
      await fs.writeFile(
        path.join(folder, "metadata-snapshot.json"),
        JSON.stringify({ target, version, columns, snapshot }, null, 2),
        { mode: 0o600 },
      );
      console.log(
        "Preflight passed. Scoped schema/permission metadata snapshot:",
        folder,
      );
      console.log(
        "Existing financial rows are not modified by this migration. No full financial-data backup claimed.",
      );
      return;
    }
    assert.equal(existing.length, 4);
    for (const table of tables) {
      const fk = await db.query(
        "SELECT CONSTRAINT_NAME FROM information_schema.REFERENTIAL_CONSTRAINTS WHERE CONSTRAINT_SCHEMA=DATABASE() AND TABLE_NAME=?",
        [table],
      );
      assert.equal(
        fk.length,
        2,
        `${table} scoped source/payment and actor foreign keys`,
      );
      const indexes = await db.query(
        "SHOW INDEX FROM " +
          String.fromCharCode(96) +
          table +
          String.fromCharCode(96),
      );
      assert.ok(
        indexes.some((i) => String(i.Key_name).includes("retry")),
        `${table} retry index`,
      );
      if (!table.endsWith("_voids"))
        assert.ok(
          indexes.some((i) => String(i.Key_name).includes("_date")),
          `${table} date index`,
        );
      const count = await db.query(
        "SELECT COUNT(*) total FROM " +
          String.fromCharCode(96) +
          table +
          String.fromCharCode(96),
      );
      assert.equal(Number(count[0].total), 0, `${table} no inferred payments`);
    }
    for (const owner of owners)
      for (const [resource, action] of grants) {
        const rows = await db.query(
          "SELECT COUNT(*) total FROM permission WHERE roleId=? AND resource=? AND action=?",
          [owner.id, resource, action],
        );
        assert.equal(
          Number(rows[0].total),
          1,
          `${owner.name} ${resource}:${action}`,
        );
      }
    const scope = await db.query(
      "SELECT organization_id org,id project FROM wage_batches LIMIT 1",
    );
    if (scope[0]) {
      const repo = new TotalExpensesRepository(db);
      const q = new TotalExpensesQueryDto();
      const summary = await repo.summary(
        String(scope[0].org),
        String(scope[0].project),
        q,
      );
      const list = await repo.list(
        String(scope[0].org),
        String(scope[0].project),
        q,
      );
      assert.ok(typeof summary.totalPaid === "string");
      assert.ok(Array.isArray(list.items));
      console.log(
        "Actual-schema report SELECTs passed (financial values suppressed).",
      );
    }
    console.log(
      `Schema checks passed: four empty payment/history tables, scoped foreign keys/indexes and five grants per ${owners.length} owner roles. No payments/backfills written.`,
    );
  } finally {
    await db.onModuleDestroy();
  }
}
void main().catch((error: unknown) => {
  console.error(
    error instanceof Error ? error.message : "Schema verification failed",
  );
  process.exitCode = 1;
});
