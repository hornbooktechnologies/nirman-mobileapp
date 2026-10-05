/** Temporary local browser auth fixture. No login, refresh or business writes. */
import * as dotenv from "dotenv";
import * as path from "node:path";
import * as fs from "node:fs/promises";
import * as os from "node:os";
import assert from "node:assert/strict";
import { JwtService } from "@nestjs/jwt";
import { DatabaseService } from "../src/database/database.service";

dotenv.config({
  path: path.resolve(__dirname, "../../..", ".env"),
  quiet: true,
});
async function main() {
  const db = new DatabaseService();
  try {
    const contexts =
      await db.query(`SELECT u.id userId,u.email,u.roleId,om.organization_id org,p.id project
      FROM organization_members om INNER JOIN user u ON u.id=om.user_id AND u.isActive=1
      INNER JOIN role r ON r.id=om.role_id AND r.name IN ('Organization Owner','Independent Contractor Owner')
      INNER JOIN projects p ON p.organization_id=om.organization_id AND p.status='ACTIVE'
      WHERE om.status='ACTIVE' AND om.organization_wide_project_access=1
      ORDER BY (SELECT COUNT(*) FROM wage_payments wp WHERE wp.project_id=p.id) DESC LIMIT 1`);
    const c = contexts[0];
    assert.ok(
      c && process.env.JWT_SECRET,
      "Active owner context and JWT secret required",
    );
    const token = new JwtService({ secret: process.env.JWT_SECRET }).sign(
      {
        sub: String(c.userId),
        email: String(c.email),
        roleId: String(c.roleId),
      },
      { expiresIn: "20m" },
    );
    const folder = await fs.mkdtemp(path.join(os.tmpdir(), "nirman-browser-"));
    await fs.writeFile(
      path.join(folder, "state.json"),
      JSON.stringify({
        cookies: [],
        origins: [
          {
            origin: "http://localhost:3000",
            localStorage: [
              { name: "nirman-app.accessToken", value: token },
              { name: "nirman-app.activeOrganizationId", value: String(c.org) },
            ],
          },
        ],
      }),
      { mode: 0o600 },
    );
    await fs.writeFile(
      path.join(folder, "context.json"),
      JSON.stringify({
        report: `http://localhost:3000/projects/${c.project}/total-expenses`,
        organization: String(c.org),
        project: String(c.project),
      }),
      { mode: 0o600 },
    );
    console.log("Temporary local verification fixture:", folder);
  } finally {
    await db.onModuleDestroy();
  }
}
void main().catch((e: unknown) => {
  console.error(e instanceof Error ? e.message : "Fixture failed");
  process.exitCode = 1;
});
