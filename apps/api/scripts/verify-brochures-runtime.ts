import { BROCHURE_PROJECT_QUOTA_BYTES } from "@nirman-app/shared";
/** Read-only authenticated Owner smoke for Brochure visibility and library quota. */
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
  organizationId: string;
  projectId: string;
}

async function json(response: Response) {
  const body = (await response.json()) as {
    data?: unknown;
    error?: { code?: string; message?: string };
  };
  if (!response.ok)
    throw new Error(
      `Brochure runtime failed (${response.status}): ${body.error?.code ?? body.error?.message ?? "unknown"}`,
    );
  return body.data;
}

async function main() {
  const [rows] = await pool.query<ContextRow[]>(
    `SELECT u.id userId, u.email, u.roleId,
            om.organization_id organizationId, p.id projectId
     FROM organization_members om
     INNER JOIN \`user\` u ON u.id = om.user_id AND u.isActive = 1
     INNER JOIN role r ON r.id = om.role_id AND r.name = 'Organization Owner'
     INNER JOIN projects p ON p.organization_id = om.organization_id AND p.status = 'ACTIVE'
     LEFT JOIN project_members pm
       ON pm.organization_id = om.organization_id
      AND pm.project_id = p.id
      AND pm.member_id = om.id
      AND pm.status = 'ACTIVE'
     WHERE om.status = 'ACTIVE'
       AND (om.organization_wide_project_access = 1 OR pm.id IS NOT NULL)
       AND (pm.permission_mode IS NULL OR pm.permission_mode = 'ROLE_DEFAULT' OR EXISTS (
         SELECT 1 FROM project_member_permission_grants grant_row
         WHERE grant_row.organization_id = om.organization_id
           AND grant_row.project_id = p.id
           AND grant_row.member_id = om.id
           AND grant_row.permission_key = 'brochures:read'
       ))
     ORDER BY om.organization_wide_project_access DESC
     LIMIT 1`,
  );
  const context = rows[0];
  if (!context)
    throw new Error("No active Organization Owner/Project fixture exists");
  const token = new JwtService({ secret: jwtSecret }).sign(
    { sub: context.userId, email: context.email, roleId: context.roleId },
    { expiresIn: "5m" },
  );
  const baseUrl =
    process.env.BROCHURE_VERIFY_BASE_URL ?? "http://127.0.0.1:4000/api/v1";
  const headers = { Authorization: `Bearer ${token}` };
  const access = (await json(
    await fetch(
      `${baseUrl}/organizations/${context.organizationId}/project-access/me`,
      { headers },
    ),
  )) as { projects?: Array<{ id?: string; permissions?: string[] }> };
  const project = access.projects?.find(
    (item) => item.id === context.projectId,
  );
  if (!project?.permissions?.includes("brochures:read"))
    throw new Error("Owner project access does not expose brochures:read");

  const library = (await json(
    await fetch(
      `${baseUrl}/organizations/${context.organizationId}/projects/${context.projectId}/brochures`,
      { headers },
    ),
  )) as { items?: unknown[]; quota?: { limitBytes?: number | null } };
  if (
    !Array.isArray(library.items) ||
    library.quota?.limitBytes !== BROCHURE_PROJECT_QUOTA_BYTES
  )
    throw new Error("Owner brochure library returned an invalid contract");
  console.log(
    `Authenticated Organization Owner brochure access passed with ${library.items.length} existing assets and a configured brochure storage ceiling.`,
  );
}

void main().finally(() => pool.end());
