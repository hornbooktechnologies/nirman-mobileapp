/** Read-only index/query audit; records metadata, timings and EXPLAIN, never business rows. */
import * as dotenv from "dotenv";
import * as path from "node:path";
import * as fs from "node:fs/promises";
import { performance } from "node:perf_hooks";
import { JwtService } from "@nestjs/jwt";
import type { RowDataPacket } from "mysql2/promise";
import { DatabaseService } from "../src/database/database.service";
import type {
  DatabaseConnection,
  QueryParams,
} from "../src/database/database.types";
import { TotalExpensesRepository } from "../src/modules/total-expenses/total-expenses.repository";
import { TotalExpensesQueryDto } from "../src/modules/total-expenses/total-expenses.dto";
dotenv.config({
  path: path.resolve(__dirname, "../../..", ".env"),
  quiet: true,
});
class AuditDatabase extends DatabaseService {
  plans: unknown[] = [];
  capture = "";
  override async query<T extends RowDataPacket>(
    sql: string,
    params: QueryParams = [],
    connection?: DatabaseConnection,
  ): Promise<T[]> {
    if (!/^(SELECT|SHOW|EXPLAIN)\b/i.test(sql.trim()))
      throw new Error("Audit allows only read statements");
    const start = performance.now();
    const result = await super.query<T>(sql, params, connection);
    if (this.capture) {
      const queryMs = Math.round((performance.now() - start) * 100) / 100;
      const explainStart = performance.now();
      const plan = await super.query("EXPLAIN " + sql, params, connection);
      this.plans.push({
        label: this.capture,
        queryMs,
        explainMs: Math.round((performance.now() - explainStart) * 100) / 100,
        sql,
        plan,
      });
    }
    return result;
  }
}
async function main() {
  const db = new AuditDatabase();
  try {
    const server = await db.query("SELECT VERSION() version");
    const tables = await db.query(
      "SELECT TABLE_NAME name,ENGINE engine,TABLE_ROWS estimatedRows,DATA_LENGTH dataBytes,INDEX_LENGTH indexBytes FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() ORDER BY TABLE_NAME",
    );
    const statistics = await db.query(
      "SELECT TABLE_NAME tableName,INDEX_NAME indexName,NON_UNIQUE nonUnique,SEQ_IN_INDEX sequence,COLUMN_NAME columnName,CARDINALITY cardinality,SUB_PART prefixLength FROM information_schema.STATISTICS WHERE TABLE_SCHEMA=DATABASE() ORDER BY TABLE_NAME,INDEX_NAME,SEQ_IN_INDEX",
    );
    const variables = await db.query(
      "SHOW VARIABLES WHERE Variable_name IN ('max_connections','innodb_buffer_pool_size','slow_query_log','long_query_time','performance_schema')",
    );
    let digests: unknown[] = [];
    try {
      digests = await db.query(
        "SELECT DIGEST_TEXT digest,COUNT_STAR calls,ROUND(SUM_TIMER_WAIT/1000000000000,3) totalSeconds,SUM_ROWS_EXAMINED examined,SUM_ROWS_SENT returnedRows FROM performance_schema.events_statements_summary_by_digest WHERE SCHEMA_NAME=DATABASE() ORDER BY SUM_TIMER_WAIT DESC LIMIT 15",
      );
    } catch {
      digests = [{ unavailable: true }];
    }
    const latencies: number[] = [];
    for (let i = 0; i < 8; i++) {
      const t = performance.now();
      await db.query("SELECT 1");
      latencies.push(Math.round((performance.now() - t) * 100) / 100);
    }
    const sample = await db.query(
      "SELECT organization_id org,project_id project,COUNT(*) n FROM material_requests GROUP BY organization_id,project_id ORDER BY n DESC LIMIT 1",
    );
    if (!sample[0]) throw new Error("No scoped project sample");
    const scope = [String(sample[0].org), String(sample[0].project)];
    const queryPlans = [
      [
        "materials.defaultList",
        "SELECT id FROM material_requests WHERE organization_id=? AND project_id=? ORDER BY updated_at DESC,id DESC LIMIT 20",
        scope,
      ],
      [
        "materials.statusList",
        "SELECT id FROM material_requests WHERE organization_id=? AND project_id=? AND status='PENDING_FINAL' ORDER BY updated_at DESC,id DESC LIMIT 20",
        scope,
      ],
      [
        "expenses.defaultList",
        "SELECT id FROM site_expenses WHERE organization_id=? AND project_id=? ORDER BY expense_date DESC,created_at DESC,id DESC LIMIT 20",
        scope,
      ],
      [
        "expenses.statusList",
        "SELECT id FROM site_expenses WHERE organization_id=? AND project_id=? AND status='APPROVED' ORDER BY expense_date DESC,created_at DESC,id DESC LIMIT 20",
        scope,
      ],
      [
        "wagePayments.month",
        "SELECT amount FROM wage_payments WHERE organization_id=? AND project_id=? AND payment_date BETWEEN ? AND ?",
        [...scope, "2026-10-01", "2026-10-31"],
      ],
      [
        "gallery.defaultList",
        "SELECT id FROM gallery_entries WHERE organization_id=? AND project_id=? ORDER BY captured_at DESC,created_at DESC,id DESC LIMIT 20",
        scope,
      ],
      [
        "progress.latestStage",
        "SELECT id FROM project_progress_updates WHERE organization_id=? AND project_id=? AND stage=? ORDER BY update_date DESC,created_at DESC,id DESC LIMIT 1",
        [...scope, "FOUNDATION"],
      ],
    ] as const;
    for (const [label, sql, params] of queryPlans) {
      const t = performance.now();
      try {
        const plan = await db.query("EXPLAIN " + sql, params);
        db.plans.push({
          label,
          sql,
          ms: Math.round((performance.now() - t) * 100) / 100,
          plan,
        });
      } catch (e) {
        db.plans.push({
          label,
          error: e instanceof Error ? e.message : "failed",
        });
      }
    }
    const repo = new TotalExpensesRepository(db);
    const q = new TotalExpensesQueryDto();
    q.startDate = "2026-10-01";
    q.endDate = "2026-10-31";
    db.capture = "totalExpenses.monthSummary";
    await repo.summary(scope[0], scope[1], q);
    db.capture = "totalExpenses.monthList";
    await repo.list(scope[0], scope[1], q);
    db.capture = "";
    const counts: Record<string, number> = {};
    for (const table of [
      "material_requests",
      "material_purchases",
      "site_expenses",
      "site_expense_adjustments",
      "wage_payments",
      "wage_items",
      "projects",
      "project_members",
      "organization_members",
    ]) {
      const rows = await db.query("SELECT COUNT(*) n FROM " + table);
      counts[table] = Number(rows[0].n);
    }
    const http: unknown[] = [];
    const owners = await db.query(
      `SELECT u.id userId,u.email,u.roleId,om.organization_id org,p.id project FROM organization_members om INNER JOIN user u ON u.id=om.user_id AND u.isActive=1 INNER JOIN role r ON r.id=om.role_id AND r.name IN ('Organization Owner','Independent Contractor Owner') INNER JOIN projects p ON p.organization_id=om.organization_id AND p.status='ACTIVE' WHERE om.status='ACTIVE' AND om.organization_wide_project_access=1 ORDER BY (SELECT COUNT(*) FROM material_requests mr WHERE mr.organization_id=p.organization_id AND mr.project_id=p.id) DESC LIMIT 1`,
    );
    if (owners[0] && process.env.JWT_SECRET) {
      const c = owners[0];
      const token = new JwtService({ secret: process.env.JWT_SECRET }).sign(
        {
          sub: String(c.userId),
          email: String(c.email),
          roleId: String(c.roleId),
        },
        { expiresIn: "5m" },
      );
      const base =
        process.env.PERFORMANCE_VERIFY_BASE_URL ??
        "http://127.0.0.1:4000/api/v1";
      const op = `${base}/organizations/${c.org}`;
      const pr = `${op}/projects/${c.project}`;
      for (const [label, url] of [
        ["projectAccess", `${op}/project-access/me`],
        ["dashboard", `${pr}/dashboard`],
        ["materialsList", `${pr}/materials`],
        ["expensesList", `${pr}/expenses`],
        [
          "totalExpensesSummary",
          `${pr}/total-expenses/summary?startDate=2026-10-01&endDate=2026-10-31`,
        ],
        [
          "totalExpensesList",
          `${pr}/total-expenses?startDate=2026-10-01&endDate=2026-10-31`,
        ],
      ]) {
        const samples: number[] = [];
        const statuses: number[] = [];
        const bytes: number[] = [];
        for (let j = 0; j < 3; j++) {
          const t = performance.now();
          const r = await fetch(url, {
            headers: { Authorization: `Bearer ${token}` },
          });
          const body = await r.arrayBuffer();
          samples.push(Math.round((performance.now() - t) * 100) / 100);
          statuses.push(r.status);
          bytes.push(body.byteLength);
        }
        http.push({
          label,
          samplesMs: samples,
          statuses,
          responseBytes: bytes,
        });
      }
    }
    const target = path.resolve(
      __dirname,
      process.env.PERFORMANCE_AUDIT_OUTPUT ??
        "../../../docs/tasks/performance-index-audit-evidence.json",
    );
    await fs.writeFile(
      target,
      JSON.stringify(
        {
          capturedAt: new Date().toISOString(),
          server,
          tables,
          statistics,
          variables,
          digests,
          select1Ms: latencies,
          exactCounts: counts,
          http,
          plans: db.plans,
          notes: [
            "Metadata only; no source IDs, parameters, tokens or business row data recorded.",
            "Table row estimates and EXPLAIN costs are estimates; small current dataset is not production load acceptance.",
            "queryMs measures the SELECT and result transfer; explainMs is separate. Manual plan ms measures EXPLAIN only. SELECT 1 measures warm round trips; local HTTP includes authentication, API and remote DB, excluding device networking/rendering.",
          ],
        },
        null,
        2,
      ) + "\n",
    );
    console.log("Read-only audit saved:", target);
    console.log(
      "Tables:",
      tables.length,
      "Index-column rows:",
      statistics.length,
      "Warm SELECT 1 ms:",
      latencies.join(", "),
    );
    console.log("Exact table counts:", JSON.stringify(counts));
    console.log("Local HTTP baseline:", JSON.stringify(http));
  } finally {
    await db.onModuleDestroy();
  }
}
void main().catch((e: unknown) => {
  console.error(e instanceof Error ? e.message : "Audit failed");
  process.exitCode = 1;
});
