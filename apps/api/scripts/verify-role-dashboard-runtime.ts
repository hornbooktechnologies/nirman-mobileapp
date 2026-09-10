import * as dotenv from "dotenv";
import * as path from "node:path";
import { JwtService } from "@nestjs/jwt";
import { createPool, type RowDataPacket } from "mysql2/promise";
import { parseMigrationDatabaseUrl } from "../src/database/migrations/migration-safety";

dotenv.config({ path: path.resolve(__dirname, "../../../.env") });
const databaseUrl = process.env.DATABASE_URL;
const jwtSecret = process.env.JWT_SECRET;
if (!databaseUrl || !jwtSecret)
  throw new Error("DATABASE_URL and JWT_SECRET are required");
const target = parseMigrationDatabaseUrl(databaseUrl);
const pool = createPool({
  host: target.host,
  port: Number(target.port),
  user: target.username,
  password: target.password,
  database: target.database,
  connectionLimit: 2,
});

interface ContextRow extends RowDataPacket {
  userId: string;
  email: string;
  roleId: string;
  roleName: string;
  organizationId: string;
  projectId: string;
}

async function main() {
  const [rows] = await pool.query<
    ContextRow[]
  >(`SELECT u.id userId, u.email, u.roleId, r.name roleName,
    om.organization_id organizationId, p.id projectId
    FROM organization_members om
    INNER JOIN \`user\` u ON u.id = om.user_id AND u.isActive = 1
    INNER JOIN \`role\` r ON r.id = om.role_id
    INNER JOIN permission dp ON dp.roleId = r.id AND dp.resource = 'dashboards' AND dp.action = 'read'
    INNER JOIN projects p ON p.organization_id = om.organization_id AND p.status = 'ACTIVE'
    LEFT JOIN project_members pm ON pm.organization_id = om.organization_id AND pm.project_id = p.id AND pm.member_id = om.id AND pm.status = 'ACTIVE'
    WHERE om.status = 'ACTIVE' AND (om.organization_wide_project_access = 1 OR pm.id IS NOT NULL)
    ORDER BY om.organization_wide_project_access DESC LIMIT 1`);
  const context = rows[0];
  if (!context)
    throw new Error("No active dashboard user/project fixture is available");
  const token = new JwtService({ secret: jwtSecret }).sign(
    { sub: context.userId, email: context.email, roleId: context.roleId },
    { expiresIn: "5m" },
  );
  const baseUrl =
    process.env.DASHBOARD_VERIFY_BASE_URL ?? "http://127.0.0.1:4015/api/v1";
  const response = await fetch(
    `${baseUrl}/organizations/${context.organizationId}/projects/${context.projectId}/dashboard`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  const body = (await response.json()) as {
    data?: {
      profile?: string;
      project?: { id?: string };
      availableSections?: unknown[];
    };
    error?: { code?: string; message?: string };
  };
  if (!response.ok)
    throw new Error(
      `Dashboard runtime failed (${response.status}): ${body.error?.code ?? body.error?.message ?? "unknown"}`,
    );
  if (
    body.data?.project?.id !== context.projectId ||
    !Array.isArray(body.data.availableSections)
  )
    throw new Error("Dashboard runtime returned an invalid contract");
  console.log(
    `Authenticated dashboard runtime passed for ${context.roleName} (${body.data.profile}) with ${body.data.availableSections.length} sections.`,
  );
}

void main().finally(() => pool.end());
