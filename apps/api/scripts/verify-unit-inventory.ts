import * as dotenv from "dotenv";
import * as path from "node:path";
import { createConnection, type RowDataPacket } from "mysql2/promise";
import {
  formatMigrationTarget,
  parseMigrationDatabaseUrl,
  parseMigrationTarget,
} from "../src/database/migrations/migration-safety";

dotenv.config({ path: path.resolve(__dirname, "../../../.env") });

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL is not set");

const expectedTables = [
  "sales_unit_blocks",
  "sales_unit_hold_requests",
  "sales_unit_interests",
  "sales_units",
] as const;

const expectedUnitColumns = ["price_basis", "rate_per_sqft"] as const;

const expectedUniqueIndexes = [
  "uq_sales_unit_blocks_active",
  "uq_sales_unit_hold_pending_lead",
  "uq_sales_unit_interest_lead",
  "uq_sales_units_project_number",
] as const;

const expectedAdminActions = [
  "block",
  "book",
  "interest",
  "manage",
  "read",
  "request-block",
] as const;

const expectedSalesUserActions = [
  "book",
  "interest",
  "read",
  "request-block",
] as const;

type NameRow = RowDataPacket & { name: string };
type RoleGrantRow = RowDataPacket & { roleName: string; actionName: string };
type CountRow = RowDataPacket & { unitCount: number; activeBlockCount: number };

function missing(actual: readonly string[], expected: readonly string[]) {
  const values = new Set(actual);
  return expected.filter((value) => !values.has(value));
}

async function main(connectionUrl: string) {
  const target = parseMigrationTarget(connectionUrl);
  const parsed = parseMigrationDatabaseUrl(connectionUrl);
  console.log(`Target: ${formatMigrationTarget(target)}`);

  const connection = await createConnection({
    host: parsed.host,
    port: Number(parsed.port),
    user: parsed.username,
    password: parsed.password,
    database: parsed.database,
  });

  try {
    const [tableRows] = await connection.query<NameRow[]>(
      `SELECT TABLE_NAME name
       FROM information_schema.TABLES
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME IN (?)
       ORDER BY TABLE_NAME`,
      [[...expectedTables]],
    );
    const missingTables = missing(
      tableRows.map((row) => row.name),
      expectedTables,
    );
    if (missingTables.length) {
      throw new Error(
        `Missing Unit inventory tables: ${missingTables.join(", ")}`,
      );
    }

    const [columnRows] = await connection.query<NameRow[]>(
      `SELECT COLUMN_NAME name
       FROM information_schema.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'sales_units'
       ORDER BY ORDINAL_POSITION`,
    );
    const missingColumns = missing(
      columnRows.map((row) => row.name),
      expectedUnitColumns,
    );
    if (missingColumns.length) {
      throw new Error(`sales_units is missing: ${missingColumns.join(", ")}`);
    }

    const [indexRows] = await connection.query<NameRow[]>(
      `SELECT DISTINCT INDEX_NAME name
       FROM information_schema.STATISTICS
       WHERE TABLE_SCHEMA = DATABASE()
         AND NON_UNIQUE = 0
         AND INDEX_NAME IN (?)
       ORDER BY INDEX_NAME`,
      [[...expectedUniqueIndexes]],
    );
    const missingIndexes = missing(
      indexRows.map((row) => row.name),
      expectedUniqueIndexes,
    );
    if (missingIndexes.length) {
      throw new Error(
        `Missing Unit inventory concurrency indexes: ${missingIndexes.join(", ")}`,
      );
    }

    const [grantRows] = await connection.query<RoleGrantRow[]>(
      `SELECT r.name roleName, p.action actionName
       FROM \`role\` r
       INNER JOIN permission p ON p.roleId = r.id
       WHERE p.resource = 'inventory'
       ORDER BY r.name, p.action`,
    );
    const actionsFor = (roleName: string) =>
      grantRows
        .filter((row) => row.roleName === roleName)
        .map((row) => row.actionName);

    for (const roleName of [
      "Organization Owner",
      "Builder Admin",
      "Independent Contractor Owner",
    ]) {
      const missingActions = missing(
        actionsFor(roleName),
        expectedAdminActions,
      );
      if (missingActions.length) {
        throw new Error(
          `${roleName} is missing inventory grants: ${missingActions.join(", ")}`,
        );
      }
    }

    const missingSalesUserActions = missing(
      actionsFor("Sales User"),
      expectedSalesUserActions,
    );
    if (missingSalesUserActions.length) {
      throw new Error(
        `Sales User is missing inventory grants: ${missingSalesUserActions.join(", ")}`,
      );
    }
    if (actionsFor("Sales User").includes("block")) {
      throw new Error("Sales User must not receive inventory:block");
    }
    if (actionsFor("Platform Super Admin").length) {
      throw new Error(
        "Platform Super Admin must not receive inventory permissions",
      );
    }

    const [countRows] = await connection.query<CountRow[]>(
      `SELECT
         (SELECT COUNT(*) FROM sales_units) unitCount,
         (SELECT COUNT(*) FROM sales_unit_blocks WHERE status = 'ACTIVE') activeBlockCount`,
    );

    console.log(
      `Unit inventory tables: ${tableRows.length}/${expectedTables.length}`,
    );
    console.log(
      `Concurrency indexes: ${indexRows.length}/${expectedUniqueIndexes.length}`,
    );
    console.log(
      `Sales User inventory grants: ${actionsFor("Sales User").join(", ")}`,
    );
    console.log(`Existing Units: ${countRows[0]?.unitCount ?? 0}`);
    console.log(`Active Unit blocks: ${countRows[0]?.activeBlockCount ?? 0}`);
  } finally {
    await connection.end();
  }
}

void main(databaseUrl);
