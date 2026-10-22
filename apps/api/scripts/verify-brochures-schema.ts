/** Read-only post-rollout verification for Sales Brochures schema and default grants. */
import * as dotenv from "dotenv";
import * as path from "node:path";
import { createConnection, type RowDataPacket } from "mysql2/promise";
import {
  formatMigrationTarget,
  parseMigrationDatabaseUrl,
  parseMigrationTarget,
} from "../src/database/migrations/migration-safety";

const rootDir = path.resolve(__dirname, "../../..");
dotenv.config({ path: path.join(rootDir, ".env") });

type Row = RowDataPacket & Record<string, unknown>;
const expectedTables = [
  "brochure_assets",
  "brochure_share_assets",
  "brochure_share_events",
  "brochure_shares",
];
const expectedGrants: Record<string, string[]> = {
  "Builder Admin": ["manage", "read", "share", "upload"],
  "Independent Contractor Owner": ["manage", "read", "share", "upload"],
  "Organization Owner": ["manage", "read", "share", "upload"],
  "Sales User": ["read", "share", "upload"],
};

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error("DATABASE_URL is required");
  const target = parseMigrationTarget(databaseUrl);
  const parsed = parseMigrationDatabaseUrl(databaseUrl);
  const connection = await createConnection({
    host: parsed.host,
    port: Number(parsed.port),
    user: parsed.username,
    password: parsed.password,
    database: parsed.database,
  });
  try {
    const [tables] = await connection.query<Row[]>(
      `SELECT TABLE_NAME tableName
       FROM information_schema.TABLES
       WHERE TABLE_SCHEMA = DATABASE()
         AND TABLE_NAME IN (?, ?, ?, ?)
       ORDER BY TABLE_NAME`,
      expectedTables,
    );
    const actualTables = tables.map((row) => String(row.tableName));
    if (
      actualTables.length !== expectedTables.length ||
      expectedTables.some((table) => !actualTables.includes(table))
    )
      throw new Error(
        `Brochure table verification failed: ${actualTables.join(", ")}`,
      );

    const [grants] = await connection.query<Row[]>(
      `SELECT r.name roleName, p.action
       FROM role r
       INNER JOIN permission p ON p.roleId = r.id
       WHERE p.resource = 'brochures'
       ORDER BY r.name, p.action`,
    );
    const actual = new Map<string, string[]>();
    for (const row of grants) {
      const role = String(row.roleName);
      actual.set(role, [...(actual.get(role) ?? []), String(row.action)]);
    }
    for (const [role, actions] of Object.entries(expectedGrants)) {
      const roleActions = actual.get(role) ?? [];
      if (
        roleActions.length !== actions.length ||
        actions.some((action) => !roleActions.includes(action))
      )
        throw new Error(`Brochure grants are incorrect for ${role}`);
    }

    const [customOwnerGaps] = await connection.query<Row[]>(
      `SELECT COUNT(*) gapCount
       FROM project_members pm
       INNER JOIN organization_members om
         ON om.id = pm.member_id AND om.organization_id = pm.organization_id
       INNER JOIN role r ON r.id = om.role_id
       WHERE pm.permission_mode = 'CUSTOM'
         AND pm.status = 'ACTIVE'
         AND r.name IN ('Organization Owner', 'Builder Admin', 'Independent Contractor Owner')
         AND NOT EXISTS (
           SELECT 1 FROM project_member_permission_grants grant_row
           WHERE grant_row.organization_id = pm.organization_id
             AND grant_row.project_id = pm.project_id
             AND grant_row.member_id = pm.member_id
             AND grant_row.permission_key = 'brochures:read'
         )`,
    );
    const customOwnerGapCount = Number(customOwnerGaps[0]?.gapCount ?? 0);

    console.log(`Target: ${formatMigrationTarget(target)}`);
    console.log(`Brochure tables verified: ${actualTables.length}`);
    for (const role of Object.keys(expectedGrants))
      console.log(`${role}: ${actual.get(role)!.join(", ")}`);
    console.log(
      `Custom Owner assignments missing brochures:read: ${customOwnerGapCount}`,
    );
  } finally {
    await connection.end();
  }
}

void main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
