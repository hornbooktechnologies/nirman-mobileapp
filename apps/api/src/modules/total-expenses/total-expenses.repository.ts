import { Injectable } from "@nestjs/common";
import type { RowDataPacket } from "mysql2/promise";
import type {
  SpendingCard,
  TotalExpensesList,
  TotalExpensesSummary,
  SpendingSource,
} from "@nirman-app/shared";
import { moneyPaise, paiseMoney } from "@nirman-app/shared";
import { DatabaseService } from "../../database/database.service";
import type { TotalExpensesQueryDto } from "./total-expenses.dto";
@Injectable()
export class TotalExpensesRepository {
  constructor(private readonly db: DatabaseService) {}
  /** One row per active payment. No join to source item collections that could multiply money. */
  private events(source: SpendingSource = "ALL") {
    const branches = [
      `
 SELECT 'WAGES' source, wb.id, CONCAT('Wages · ',wb.period_start,' – ',wb.period_end) title,
 '' subtitle, wb.id detailId, wb.period_start periodStart, wb.period_end periodEnd,
 NULL purchasedOn, NULL category, NULL expenseDate,
 (SELECT SUM(i.net_amount) FROM wage_items i WHERE i.wage_batch_id=wb.id) payable,
 p.amount, p.payment_date paymentDate
 FROM wage_payments p INNER JOIN wage_items wi ON wi.id=p.wage_item_id AND wi.organization_id=p.organization_id AND wi.project_id=p.project_id AND wi.wage_batch_id=p.wage_batch_id
 INNER JOIN wage_batches wb ON wb.id=wi.wage_batch_id AND wb.organization_id=p.organization_id AND wb.project_id=p.project_id
 WHERE p.organization_id=? AND p.project_id=? AND wb.status IN ('CONFIRMED','PARTIALLY_PAID','PAID')
`,
      `
 SELECT 'MATERIALS' source,mp.id id,mr.material_name title,COALESCE(mp.vendor_name,'') subtitle,mr.id detailId,NULL periodStart,NULL periodEnd,mp.purchased_on purchasedOn,NULL category,NULL expenseDate,mp.total_cost payable,p.amount,p.payment_date paymentDate
 FROM material_purchase_payments p INNER JOIN material_purchases mp ON mp.id=p.material_purchase_id AND mp.organization_id=p.organization_id AND mp.project_id=p.project_id
 INNER JOIN material_requests mr ON mr.id=mp.material_request_id AND mr.organization_id=mp.organization_id AND mr.project_id=mp.project_id
 LEFT JOIN material_purchase_payments_voids v ON v.payment_id=p.id
 WHERE p.organization_id=? AND p.project_id=? AND v.id IS NULL
`,
      `
 SELECT 'SITE_EXPENSES' source,e.id id,e.description title,COALESCE(e.vendor_payee,'') subtitle,e.id detailId,NULL periodStart,NULL periodEnd,NULL purchasedOn,e.category,e.expense_date expenseDate,
 e.amount+COALESCE((SELECT SUM(a.amount) FROM site_expense_adjustments a WHERE a.site_expense_id=e.id),0) payable,p.amount,p.payment_date paymentDate
 FROM site_expense_payments p INNER JOIN site_expenses e ON e.id=p.site_expense_id AND e.organization_id=p.organization_id AND e.project_id=p.project_id
 LEFT JOIN site_expense_payments_voids v ON v.payment_id=p.id
 WHERE p.organization_id=? AND p.project_id=? AND e.status='APPROVED' AND v.id IS NULL`,
    ];
    return (
      source === "ALL"
        ? branches
        : [branches[{ WAGES: 0, MATERIALS: 1, SITE_EXPENSES: 2 }[source]]]
    ).join(" UNION ALL ");
  }
  private params(org: string, project: string, source: SpendingSource = "ALL") {
    return source === "ALL"
      ? [org, project, org, project, org, project]
      : [org, project];
  }
  private dates(q: TotalExpensesQueryDto) {
    return q.startDate ? "paymentDate BETWEEN ? AND ?" : "1=1";
  }
  async list(
    org: string,
    project: string,
    q: TotalExpensesQueryDto,
  ): Promise<TotalExpensesList> {
    return this.db.transaction(async (c) => {
      const dateParams = q.startDate ? [q.startDate, q.endDate!] : [];
      const group = `SELECT source,id,MAX(title) title,MAX(subtitle) subtitle,MAX(detailId) detailId,MAX(periodStart) periodStart,MAX(periodEnd) periodEnd,MAX(purchasedOn) purchasedOn,MAX(category) category,MAX(expenseDate) expenseDate,CAST(SUM(amount) AS CHAR) lifetimePaidAmount,CAST(GREATEST(MAX(payable)-SUM(amount),0) AS CHAR) remainingAmount,CASE WHEN SUM(amount)>=MAX(payable) THEN 'PAID' ELSE 'PARTIALLY_PAID' END paymentStatus,CAST(SUM(CASE WHEN ${this.dates(q)} THEN amount ELSE 0 END) AS CHAR) periodPaidAmount,MAX(CASE WHEN ${this.dates(q)} THEN paymentDate ELSE NULL END) latestPaymentDate FROM (${this.events(q.source)}) events GROUP BY source,id HAVING latestPaymentDate IS NOT NULL`;
      const params = [
        ...dateParams,
        ...dateParams,
        ...this.params(org, project, q.source),
      ];
      const count = await this.db.query<RowDataPacket>(
        `SELECT COUNT(*) total FROM (${group}) grouped`,
        params,
        c,
      );
      const rows = await this.db.query<RowDataPacket>(
        `${group} ORDER BY latestPaymentDate DESC,source ASC,id ASC LIMIT ${q.pageSize} OFFSET ${(q.page - 1) * q.pageSize}`,
        params,
        c,
      );
      const items = rows.map((row) => ({
        ...row,
        classificationReview: ["MATERIAL_PURCHASE", "LABOUR_RELATED"].includes(
          String(row.category),
        ),
      })) as SpendingCard[];
      const total = Number(count[0].total);
      return {
        items,
        pagination: {
          page: q.page,
          pageSize: q.pageSize,
          total,
          totalPages: Math.ceil(total / q.pageSize),
        },
      };
    }, true);
  }
  async summary(
    org: string,
    project: string,
    q: TotalExpensesQueryDto,
  ): Promise<TotalExpensesSummary> {
    return this.db.transaction(async (c) => {
      const date = q.startDate ? " AND p.payment_date BETWEEN ? AND ?" : "";
      const branches = [
        `SELECT 'WAGES' source,p.amount,p.payment_date paymentDate FROM wage_payments p
         INNER JOIN wage_items wi ON wi.id=p.wage_item_id AND wi.organization_id=p.organization_id AND wi.project_id=p.project_id AND wi.wage_batch_id=p.wage_batch_id
         INNER JOIN wage_batches wb ON wb.id=wi.wage_batch_id AND wb.organization_id=p.organization_id AND wb.project_id=p.project_id
         WHERE p.organization_id=? AND p.project_id=? AND wb.status IN ('CONFIRMED','PARTIALLY_PAID','PAID')${date}`,
        `SELECT 'MATERIALS' source,p.amount,p.payment_date paymentDate FROM material_purchase_payments p
         INNER JOIN material_purchases mp ON mp.id=p.material_purchase_id AND mp.organization_id=p.organization_id AND mp.project_id=p.project_id
         INNER JOIN material_requests mr ON mr.id=mp.material_request_id AND mr.organization_id=mp.organization_id AND mr.project_id=mp.project_id
         LEFT JOIN material_purchase_payments_voids v ON v.payment_id=p.id
         WHERE p.organization_id=? AND p.project_id=? AND v.id IS NULL${date}`,
        `SELECT 'SITE_EXPENSES' source,p.amount,p.payment_date paymentDate FROM site_expense_payments p
         INNER JOIN site_expenses e ON e.id=p.site_expense_id AND e.organization_id=p.organization_id AND e.project_id=p.project_id
         LEFT JOIN site_expense_payments_voids v ON v.payment_id=p.id
         WHERE p.organization_id=? AND p.project_id=? AND e.status='APPROVED' AND v.id IS NULL${date}`,
      ];
      const params = branches.flatMap(() => [
        org,
        project,
        ...(q.startDate ? [q.startDate, q.endDate!] : []),
      ]);
      const months = (await this.db.query<RowDataPacket>(
        `SELECT DATE_FORMAT(paymentDate,'%Y-%m') month,
         CAST(SUM(amount) AS CHAR) totalPaid,
         CAST(SUM(CASE WHEN source='WAGES' THEN amount ELSE 0 END) AS CHAR) wagesPaid,
         CAST(SUM(CASE WHEN source='MATERIALS' THEN amount ELSE 0 END) AS CHAR) materialsPaid,
         CAST(SUM(CASE WHEN source='SITE_EXPENSES' THEN amount ELSE 0 END) AS CHAR) siteExpensesPaid
         FROM (${branches.join(" UNION ALL ")}) events GROUP BY month ORDER BY month`,
        params,
        c,
      )) as TotalExpensesSummary["months"];
      const sum = (
        key: "totalPaid" | "wagesPaid" | "materialsPaid" | "siteExpensesPaid",
      ) =>
        paiseMoney(
          months.reduce((total, month) => total + moneyPaise(month[key]), 0n),
        );
      return {
        totalPaid: sum("totalPaid"),
        wagesPaid: sum("wagesPaid"),
        materialsPaid: sum("materialsPaid"),
        siteExpensesPaid: sum("siteExpensesPaid"),
        months,
      };
    }, true);
  }
}
