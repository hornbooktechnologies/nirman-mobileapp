import * as dotenv from "dotenv";
import * as path from "node:path";
import { JwtService } from "@nestjs/jwt";
import { DatabaseService } from "../src/database/database.service";
dotenv.config({
  path: path.resolve(__dirname, "../../..", ".env"),
  quiet: true,
});
async function main() {
  const db = new DatabaseService();
  try {
    const rows = await db.query(
      `SELECT u.id userId,u.email,u.roleId,om.organization_id org,p.id project,e.id expense FROM organization_members om INNER JOIN user u ON u.id=om.user_id AND u.isActive=1 INNER JOIN role r ON r.id=om.role_id AND r.name IN ('Organization Owner','Independent Contractor Owner') INNER JOIN projects p ON p.organization_id=om.organization_id AND p.status='ACTIVE' INNER JOIN site_expenses e ON e.project_id=p.id AND e.status='APPROVED' WHERE om.status='ACTIVE' AND om.organization_wide_project_access=1 ORDER BY e.updated_at DESC LIMIT 1`,
    );
    const c = rows[0];
    if (!c) throw Error("No approved owner expense fixture");
    const token = new JwtService({ secret: process.env.JWT_SECRET }).sign(
      { sub: c.userId, email: c.email, roleId: c.roleId },
      { expiresIn: "3m" },
    );
    for (const base of [
      "https://nirman-mobileapp-web.vercel.app/api/v1",
      "https://nirman-mobileapp-api.vercel.app/api/v1",
      "http://127.0.0.1:4000/api/v1",
    ]) {
      try {
        const r = await fetch(
          `${base}/organizations/${c.org}/projects/${c.project}/expenses/${c.expense}`,
          {
            headers: { Authorization: `Bearer ${token}` },
            signal: AbortSignal.timeout(20000),
          },
        );
        const body = await r.json().catch(() => ({}));
        const d = body.data;
        console.log(
          JSON.stringify({
            base,
            status: r.status,
            code: body.error?.code,
            ledgerFields: d
              ? {
                  status: d.status,
                  tracking: d.paymentTrackingAvailable,
                  hasPaymentStatus: typeof d.paymentStatus === "string",
                  hasPayments: Array.isArray(d.payments),
                  hasRemaining: d.remainingAmount !== undefined,
                  availableActions: d.availableActions,
                }
              : undefined,
          }),
        );
      } catch (e) {
        console.log(
          JSON.stringify({
            base,
            error: e instanceof Error ? e.name : "Unknown",
          }),
        );
      }
    }
  } finally {
    await db.onModuleDestroy();
  }
}
void main().catch((e) => {
  console.error(e instanceof Error ? e.name : "Unknown");
  process.exitCode = 1;
});
