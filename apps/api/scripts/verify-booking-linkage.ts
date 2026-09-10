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

const expectedColumns = [
  "request_fingerprint",
  "lead_source",
  "lead_stage_before_booking",
  "unit_status_before_booking",
  "restored_lead_stage",
  "restored_unit_status",
] as const;

type NameRow = RowDataPacket & { name: string };
type GrantRow = RowDataPacket & {
  roleName: string;
  resourceName: string;
  actionName: string;
};
type CountRow = RowDataPacket & {
  bookingCount: number;
  missingLeadSourceCount: number;
  bookingAuditCount: number;
};

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
    const [columnRows] = await connection.query<NameRow[]>(
      `SELECT COLUMN_NAME name
       FROM information_schema.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'sales_bookings'
       ORDER BY ORDINAL_POSITION`,
    );
    const missingColumns = missing(
      columnRows.map((row) => row.name),
      expectedColumns,
    );
    if (missingColumns.length) {
      throw new Error(
        `sales_bookings is missing: ${missingColumns.join(", ")}`,
      );
    }

    const [indexRows] = await connection.query<NameRow[]>(
      `SELECT DISTINCT INDEX_NAME name
       FROM information_schema.STATISTICS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'sales_bookings'
         AND INDEX_NAME IN (
           'uq_sales_bookings_confirmed_lead',
           'uq_sales_bookings_idempotency',
           'idx_sales_bookings_project_status_date'
         )
       ORDER BY INDEX_NAME`,
    );
    if (indexRows.length !== 3) {
      throw new Error("Booking linkage indexes are incomplete");
    }

    const [auditTableRows] = await connection.query<NameRow[]>(
      `SELECT TABLE_NAME name FROM information_schema.TABLES
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'audit_events'`,
    );
    if (!auditTableRows.length) throw new Error("audit_events is missing");

    const [grantRows] = await connection.query<GrantRow[]>(
      `SELECT r.name roleName, p.resource resourceName, p.action actionName
       FROM \`role\` r
       INNER JOIN permission p ON p.roleId = r.id
       WHERE (p.resource = 'leads' AND p.action = 'convert')
          OR (p.resource = 'inventory' AND p.action = 'book')
       ORDER BY r.name, p.resource`,
    );
    const grantsFor = (roleName: string) =>
      grantRows
        .filter((row) => row.roleName === roleName)
        .map((row) => `${row.resourceName}:${row.actionName}`);
    for (const roleName of [
      "Organization Owner",
      "Builder Admin",
      "Independent Contractor Owner",
      "Sales User",
    ]) {
      const missingGrants = missing(grantsFor(roleName), [
        "leads:convert",
        "inventory:book",
      ]);
      if (missingGrants.length) {
        throw new Error(`${roleName} is missing: ${missingGrants.join(", ")}`);
      }
    }
    if (grantsFor("Platform Super Admin").length) {
      throw new Error(
        "Platform Super Admin must not receive booking permissions",
      );
    }

    const [countRows] = await connection.query<CountRow[]>(
      `SELECT
         (SELECT COUNT(*) FROM sales_bookings) bookingCount,
         (SELECT COUNT(*) FROM sales_bookings WHERE lead_source IS NULL) missingLeadSourceCount,
         (SELECT COUNT(*) FROM audit_events
           WHERE action IN ('sales.booking-confirmed', 'sales.booking-cancelled')) bookingAuditCount`,
    );
    if ((countRows[0]?.missingLeadSourceCount ?? 0) > 0) {
      throw new Error(
        "Existing booking rows are missing the Lead source snapshot",
      );
    }

    console.log(
      `Booking columns: ${expectedColumns.length}/${expectedColumns.length}`,
    );
    console.log(`Booking indexes: ${indexRows.length}/3`);
    console.log(`Existing bookings: ${countRows[0]?.bookingCount ?? 0}`);
    console.log(
      `Booking audit events: ${countRows[0]?.bookingAuditCount ?? 0}`,
    );
    console.log(`Sales User grants: ${grantsFor("Sales User").join(", ")}`);
  } finally {
    await connection.end();
  }
}

void main(databaseUrl);
