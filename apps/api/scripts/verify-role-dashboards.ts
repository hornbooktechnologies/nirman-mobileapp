import * as dotenv from "dotenv";
import * as path from "node:path";
import { createPool, type RowDataPacket } from "mysql2/promise";
import { ORGANIZATION_ROLE_NAMES_BY_TYPE } from "@nirman-app/shared";
import { parseMigrationDatabaseUrl } from "../src/database/migrations/migration-safety";

dotenv.config({ path: path.resolve(__dirname, "../../../.env") });
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL is not set");
const target = parseMigrationDatabaseUrl(databaseUrl);
const pool = createPool({
  host: target.host,
  port: Number(target.port),
  user: target.username,
  password: target.password,
  database: target.database,
  connectionLimit: 2,
});

interface CountRow extends RowDataPacket {
  count: number;
}
interface RoleRow extends RowDataPacket {
  name: string;
}

async function main() {
  const [roles] = await pool.query<RoleRow[]>(`SELECT r.name FROM \`role\` r
    INNER JOIN permission p ON p.roleId = r.id
    WHERE p.resource = 'dashboards' AND p.action = 'read'`);
  const granted = new Set(roles.map((role) => role.name));
  const expected = [
    ...new Set([
      ...ORGANIZATION_ROLE_NAMES_BY_TYPE.BUILDER,
      ...ORGANIZATION_ROLE_NAMES_BY_TYPE.CONTRACTOR,
    ]),
  ];
  const missing = expected.filter(
    (role) => role !== "Member" && !granted.has(role),
  );
  if (missing.length)
    throw new Error(`Dashboard permission missing for: ${missing.join(", ")}`);
  const [indexes] = await pool.query<CountRow[]>(
    `SELECT COUNT(DISTINCT index_name) count FROM information_schema.statistics
    WHERE table_schema = ? AND index_name IN (
      'idx_worker_assignments_dashboard_active','idx_sales_leads_dashboard_assignee',
      'idx_sales_followups_dashboard_due','idx_sales_site_visits_dashboard_due'
    )`,
    [target.database],
  );
  if (Number(indexes[0]?.count) !== 4)
    throw new Error("One or more dashboard indexes are missing");
  console.log(
    `Verified dashboards:read on ${granted.size} roles and 4 dashboard indexes in ${target.database}.`,
  );
}

void main().finally(() => pool.end());
