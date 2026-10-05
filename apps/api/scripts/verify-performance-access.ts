/** Read-only equivalence check for batched Material approval eligibility. */
import * as dotenv from "dotenv";
import * as path from "node:path";
import assert from "node:assert/strict";
import { RowDataPacket } from "mysql2";
import { DatabaseService } from "../src/database/database.service";
import {
  findMaterialApprovalMembers,
  findMaterialApprovalForMemberProjects,
} from "../src/modules/project-access/material-approval-policy";

dotenv.config({
  path: path.resolve(__dirname, "../../..", ".env"),
  quiet: true,
});
async function main() {
  const db = new DatabaseService();
  try {
    const contexts = await db.query<
      RowDataPacket & { org: string; member: string }
    >(
      `SELECT organization_id org,id member FROM organization_members
       WHERE status='ACTIVE' ORDER BY organization_id,id LIMIT 8`,
    );
    let comparisons = 0;
    for (const context of contexts) {
      const projects = await db.query<RowDataPacket & { id: string }>(
        "SELECT id FROM projects WHERE organization_id=? ORDER BY id LIMIT 4",
        [context.org],
      );
      const actual = await findMaterialApprovalForMemberProjects(
        db,
        context.org,
        context.member,
        projects.map((p) => p.id),
      );
      for (const project of projects) {
        const original = await findMaterialApprovalMembers(
          db,
          context.org,
          project.id,
        );
        const expected = original.some(
          (m) => m.memberId === context.member && Boolean(m.canApprove),
        );
        assert.equal(
          actual.has(project.id),
          expected,
          "Approval eligibility must match original policy",
        );
        comparisons++;
      }
    }
    assert.ok(comparisons > 0, "Require populated comparison contexts");
    console.log(
      `Read-only batch eligibility parity passed: ${comparisons} member/project comparisons; no identities printed.`,
    );
  } finally {
    await db.onModuleDestroy();
  }
}
void main().catch((e: unknown) => {
  console.error(e instanceof Error ? e.message : "Access parity failed");
  process.exitCode = 1;
});
