/** Read-only preflight and verification for the two approved default-list indexes. */
import * as dotenv from "dotenv";
import * as path from "node:path";
import * as os from "node:os";
import * as fs from "node:fs/promises";
import assert from "node:assert/strict";
import { DatabaseService } from "../src/database/database.service";
import {
  formatMigrationTarget,
  parseMigrationTarget,
} from "../src/database/migrations/migration-safety";
dotenv.config({
  path: path.resolve(__dirname, "../../..", ".env"),
  quiet: true,
});
const indexes = [
  {
    table: "material_requests",
    name: "idx_material_requests_scope_updated",
    columns: ["organization_id", "project_id", "updated_at", "id"],
    order: "updated_at DESC,id DESC",
  },
  {
    table: "site_expenses",
    name: "idx_site_expenses_scope_date",
    columns: [
      "organization_id",
      "project_id",
      "expense_date",
      "created_at",
      "id",
    ],
    order: "expense_date DESC,created_at DESC,id DESC",
  },
];
async function main() {
  const db = new DatabaseService();
  try {
    console.log(
      "Target:",
      formatMigrationTarget(parseMigrationTarget(process.env.DATABASE_URL!)),
    );
    const preflight = process.argv.includes("--preflight");
    const snapshots: unknown[] = [];
    for (const item of indexes) {
      const rows = await db.query(
        "SELECT INDEX_NAME name,COLUMN_NAME columnName,SEQ_IN_INDEX sequence FROM information_schema.STATISTICS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=? ORDER BY INDEX_NAME,SEQ_IN_INDEX",
        [item.table],
      );
      const current = rows
        .filter((r) => r.name === item.name)
        .map((r) => String(r.columnName));
      if (preflight) {
        assert.equal(
          current.length,
          0,
          `${item.name} already exists; inspect before rollout`,
        );
        const byName = new Map<string, string[]>();
        for (const r of rows) {
          const cols = byName.get(String(r.name)) ?? [];
          cols.push(String(r.columnName));
          byName.set(String(r.name), cols);
        }
        assert.ok(
          !Array.from(byName.values()).some((cols) =>
            item.columns.every((c, i) => cols[i] === c),
          ),
          "Equivalent index already present",
        );
        const table = await db.query("SHOW CREATE TABLE " + item.table);
        snapshots.push({ table: item.table, rows, definition: table });
      } else {
        assert.deepEqual(current, item.columns);
        const scope = await db.query(
          "SELECT organization_id org,project_id project FROM " +
            item.table +
            " LIMIT 1",
        );
        if (scope[0]) {
          const plan = await db.query(
            `EXPLAIN SELECT id FROM ${item.table} FORCE INDEX (${item.name}) WHERE organization_id=? AND project_id=? ORDER BY ${item.order} LIMIT 20`,
            [scope[0].org, scope[0].project],
          );
          assert.ok(
            plan.every((r) => !String(r.Extra).includes("filesort")),
            "Sort-aligned index should supply default order",
          );
        }
        console.log(
          item.name + ": verified exact columns and default-order index scan",
        );
      }
    }
    if (preflight) {
      const folder = await fs.mkdtemp(
        path.join(os.tmpdir(), "nirman-index-preflight-"),
      );
      await fs.writeFile(
        path.join(folder, "schema-index-snapshot.json"),
        JSON.stringify(snapshots, null, 2),
        { mode: 0o600 },
      );
      console.log("Preflight passed; scoped schema/index snapshot:", folder);
    }
  } finally {
    await db.onModuleDestroy();
  }
}
void main().catch((e: unknown) => {
  console.error(e instanceof Error ? e.message : "Index verification failed");
  process.exitCode = 1;
});
