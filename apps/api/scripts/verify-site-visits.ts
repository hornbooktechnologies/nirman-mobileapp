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
  "id",
  "organization_id",
  "project_id",
  "lead_id",
  "scheduled_at",
  "assigned_salesperson",
  "attendee_count",
  "status",
  "customer_feedback",
  "objections_concerns",
  "next_action",
  "completed_at",
  "created_by",
  "created_at",
  "updated_at",
];

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
    const [columns] = await connection.query<
      (RowDataPacket & { COLUMN_NAME: string })[]
    >(
      `SELECT COLUMN_NAME FROM information_schema.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'sales_site_visits'
       ORDER BY ORDINAL_POSITION`,
    );
    const actualColumns = columns.map((row) => row.COLUMN_NAME);
    const missingColumns = expectedColumns.filter(
      (column) => !actualColumns.includes(column),
    );
    if (missingColumns.length)
      throw new Error(
        `sales_site_visits is missing: ${missingColumns.join(", ")}`,
      );

    const [permissionRows] = await connection.query<
      (RowDataPacket & { name: string; permission_count: number })[]
    >(
      `SELECT r.name, COUNT(*) permission_count
       FROM role r
       INNER JOIN permission p ON p.roleId = r.id
       WHERE p.resource = 'site-visits' AND p.action = 'manage'
       GROUP BY r.id, r.name
       ORDER BY r.name`,
    );
    const requiredRoles = [
      "Organization Owner",
      "Builder Admin",
      "Independent Contractor Owner",
      "Sales User",
    ];
    const grantedRoles = new Set(permissionRows.map((row) => row.name));
    const missingRoles = requiredRoles.filter(
      (role) => !grantedRoles.has(role),
    );
    if (missingRoles.length)
      throw new Error(
        `site-visits:manage is missing for: ${missingRoles.join(", ")}`,
      );
    if (grantedRoles.has("Viewer"))
      throw new Error("Viewer must not receive site-visits:manage");

    const [visitRows] = await connection.query<
      (RowDataPacket & { visit_count: number })[]
    >("SELECT COUNT(*) visit_count FROM sales_site_visits");
    console.log(`sales_site_visits: ${actualColumns.length} columns verified`);
    console.log(
      `site-visits:manage roles: ${permissionRows.map((row) => row.name).join(", ")}`,
    );
    console.log(`Existing Site Visits: ${visitRows[0]?.visit_count ?? 0}`);
  } finally {
    await connection.end();
  }
}

void main(databaseUrl);
