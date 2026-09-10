import * as dotenv from "dotenv";
import * as path from "path";
import { JwtService } from "@nestjs/jwt";
import { createConnection, type RowDataPacket } from "mysql2/promise";
import { parseMigrationDatabaseUrl } from "../src/database/migrations/migration-safety";

dotenv.config({ path: path.resolve(__dirname, "../../../.env") });

interface SmokeActorRow extends RowDataPacket {
  userId: string;
  email: string;
  roleId: string;
  organizationId: string;
  projectId: string;
}

async function main() {
  if (!process.env.DATABASE_URL || !process.env.JWT_SECRET) {
    throw new Error("DATABASE_URL and JWT_SECRET are required");
  }
  const parsed = parseMigrationDatabaseUrl(process.env.DATABASE_URL);
  const connection = await createConnection({
    host: parsed.host,
    port: Number(parsed.port),
    user: parsed.username,
    password: parsed.password,
    database: parsed.database,
  });
  try {
    const [actors] = await connection.execute<SmokeActorRow[]>(
      `SELECT u.id userId, u.email, u.roleId,
        om.organization_id organizationId, pr.id projectId
       FROM \`user\` u
       INNER JOIN organization_members om
         ON om.user_id = u.id AND om.status = 'ACTIVE'
       INNER JOIN organizations o
         ON o.id = om.organization_id AND o.status = 'ACTIVE'
       INNER JOIN permission user_permission
         ON user_permission.roleId = u.roleId
        AND user_permission.resource = 'progress'
        AND user_permission.action = 'read'
       INNER JOIN permission member_permission
         ON member_permission.roleId = om.role_id
        AND member_permission.resource = 'progress'
        AND member_permission.action = 'read'
       INNER JOIN projects pr
         ON pr.organization_id = om.organization_id AND pr.status = 'ACTIVE'
       WHERE u.isActive = 1 AND om.organization_wide_project_access = 1
       ORDER BY u.id, pr.id LIMIT 1`,
    );
    const actor = actors[0];
    if (!actor) throw new Error("No read-only Progress smoke actor is available");
    const token = new JwtService().sign(
      { sub: actor.userId, email: actor.email, roleId: actor.roleId },
      { secret: process.env.JWT_SECRET, expiresIn: "2m" },
    );
    const port = process.env.PORT ?? "4000";
    const response = await fetch(
      `http://127.0.0.1:${port}/api/v1/organizations/${actor.organizationId}/projects/${actor.projectId}/progress/summary`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    const body = (await response.json()) as {
      success?: boolean;
      data?: { overallPercentage?: number; stages?: unknown[] };
      error?: { code?: string };
    };
    console.log(
      JSON.stringify({
        status: response.status,
        success: body.success === true,
        overallPercentage: body.data?.overallPercentage ?? null,
        stageCount: body.data?.stages?.length ?? null,
        errorCode: body.error?.code ?? null,
      }),
    );
    if (!response.ok || body.success !== true || body.data?.stages?.length !== 9) {
      process.exitCode = 1;
    }
  } finally {
    await connection.end();
  }
}

void main();
