import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import type {
  ErrorCode,
  WagePreview,
  WagePreviewItem,
} from "@nirman-app/shared";
import type { AuthenticatedUser } from "../auth/types/auth.types";
import { ProjectAccessService } from "../project-access/project-access.service";
import type { CreateWageBatchDto } from "./dto/create-wage-batch.dto";
import type { RecordWagePaymentDto } from "./dto/record-wage-payment.dto";
import type { UpdateWageItemDto } from "./dto/update-wage-item.dto";
import type { WagePeriodQueryDto } from "./dto/wage-query.dto";
import { WagesRepository } from "./wages.repository";

const ZERO_MONEY = "0.00";

@Injectable()
export class WagesService {
  constructor(
    private readonly wagesRepo: WagesRepository,
    private readonly projectAccess: ProjectAccessService,
  ) {}

  async preview(
    organizationId: string,
    projectId: string,
    query: WagePeriodQueryDto,
    actor: AuthenticatedUser,
  ): Promise<WagePreview> {
    await this.projectAccess.resolveProjectAccess(
      actor,
      organizationId,
      projectId,
      "wages:read",
    );
    this.validatePeriod(query.start, query.end);
    return this.buildPreview(organizationId, projectId, query.start, query.end);
  }

  async findBatches(
    organizationId: string,
    projectId: string,
    actor: AuthenticatedUser,
  ) {
    await this.projectAccess.resolveProjectAccess(
      actor,
      organizationId,
      projectId,
      "wages:read",
    );
    return this.wagesRepo.findBatches(organizationId, projectId);
  }

  async findBatchDetail(
    organizationId: string,
    projectId: string,
    batchId: string,
    actor: AuthenticatedUser,
  ) {
    await this.projectAccess.resolveProjectAccess(
      actor,
      organizationId,
      projectId,
      "wages:read",
    );
    const detail = await this.wagesRepo.findBatchDetail(
      organizationId,
      projectId,
      batchId,
    );
    if (!detail) {
      throw new NotFoundException(
        this.error("WAGE_BATCH_NOT_FOUND", "Wage batch not found"),
      );
    }
    return detail;
  }

  async exportBatch(
    organizationId: string,
    projectId: string,
    batchId: string,
    actor: AuthenticatedUser,
  ) {
    await this.projectAccess.resolveProjectAccess(
      actor,
      organizationId,
      projectId,
      "wages:export",
    );
    const detail = await this.wagesRepo.findBatchDetail(
      organizationId,
      projectId,
      batchId,
    );
    if (!detail) {
      throw new NotFoundException(
        this.error("WAGE_BATCH_NOT_FOUND", "Wage batch not found"),
      );
    }

    return {
      filename: `wages-${projectId}-${detail.periodStart}-${detail.periodEnd}.csv`,
      csv: this.toCsv(detail),
    };
  }

  async createBatch(
    organizationId: string,
    projectId: string,
    dto: CreateWageBatchDto,
    actor: AuthenticatedUser,
  ) {
    await this.projectAccess.resolveProjectAccess(
      actor,
      organizationId,
      projectId,
      "wages:generate",
    );
    this.validatePeriod(dto.periodStart, dto.periodEnd);
    const existing = await this.wagesRepo.findActiveBatchForPeriod(
      organizationId,
      projectId,
      dto.periodStart,
      dto.periodEnd,
    );
    if (existing) {
      throw new ConflictException(
        this.error(
          "WAGE_BATCH_DUPLICATE",
          "A wage batch already exists for this project period",
        ),
      );
    }

    const preview = await this.buildPreview(
      organizationId,
      projectId,
      dto.periodStart,
      dto.periodEnd,
    );
    if (!preview.items.length || preview.items.some((item) => !item.isReady)) {
      throw new BadRequestException(
        this.error(
          "WAGE_BATCH_NOT_READY",
          "Wage batch cannot be confirmed until attendance and daily rates are ready",
        ),
      );
    }

    const created = await this.wagesRepo.createBatch(
      organizationId,
      projectId,
      dto.periodStart,
      dto.periodEnd,
      preview.items.map((item) => ({
        ...item,
        dailyRate: item.dailyRate ?? ZERO_MONEY,
      })),
      actor.id,
    );
    if (!created) {
      throw new NotFoundException(
        this.error("WAGE_BATCH_NOT_FOUND", "Wage batch not found after create"),
      );
    }
    return created;
  }

  async recordPayment(
    organizationId: string,
    projectId: string,
    wageItemId: string,
    dto: RecordWagePaymentDto,
    actor: AuthenticatedUser,
  ) {
    await this.projectAccess.resolveProjectAccess(
      actor,
      organizationId,
      projectId,
      "wages:mark-paid",
    );

    const detail = await this.tryRecordPayment(organizationId, projectId, {
      wageItemId,
      amount: this.formatMoney(this.toCents(String(dto.amount))),
      paymentDate: dto.paymentDate,
      paymentMethod: dto.paymentMethod,
      reference: dto.reference,
      idempotencyKey: dto.idempotencyKey,
      recordedBy: actor.id,
    });
    if (!detail) {
      throw new NotFoundException(
        this.error("WAGE_ITEM_NOT_FOUND", "Wage item not found"),
      );
    }
    return detail;
  }

  async updateWageItem(
    organizationId: string,
    projectId: string,
    wageItemId: string,
    dto: UpdateWageItemDto,
    actor: AuthenticatedUser,
  ) {
    await this.projectAccess.resolveProjectAccess(
      actor,
      organizationId,
      projectId,
      "wages:update",
    );

    const detail = await this.tryUpdateWageItem(organizationId, projectId, {
      wageItemId,
      adjustmentAmount:
        dto.adjustmentAmount === undefined
          ? undefined
          : this.formatMoney(this.toCents(String(dto.adjustmentAmount))),
      notes: dto.notes,
    });
    if (!detail) {
      throw new NotFoundException(
        this.error("WAGE_ITEM_NOT_FOUND", "Wage item not found"),
      );
    }
    return detail;
  }

  private async tryRecordPayment(
    organizationId: string,
    projectId: string,
    input: Parameters<WagesRepository["recordPayment"]>[2],
  ) {
    try {
      return await this.wagesRepo.recordPayment(organizationId, projectId, input);
    } catch (error) {
      if (error instanceof Error && error.message === "WAGE_ITEM_NOT_FOUND") {
        throw new NotFoundException(
          this.error("WAGE_ITEM_NOT_FOUND", "Wage item not found"),
        );
      }
      if (
        error instanceof Error &&
        error.message === "WAGE_PAYMENT_AMOUNT_INVALID"
      ) {
        throw new BadRequestException(
          this.error(
            "WAGE_PAYMENT_AMOUNT_INVALID",
            "Payment amount must be greater than zero and cannot exceed remaining payable amount",
          ),
        );
      }
      if (
        error instanceof Error &&
        error.message === "WAGE_BATCH_STATUS_INVALID"
      ) {
        throw new BadRequestException(
          this.error(
            "WAGE_BATCH_STATUS_INVALID",
            "Payments cannot be recorded for this wage batch status",
          ),
        );
      }
      throw error;
    }
  }

  private async tryUpdateWageItem(
    organizationId: string,
    projectId: string,
    input: Parameters<WagesRepository["updateWageItem"]>[2],
  ) {
    try {
      return await this.wagesRepo.updateWageItem(organizationId, projectId, input);
    } catch (error) {
      if (error instanceof Error && error.message === "WAGE_ITEM_NOT_FOUND") {
        throw new NotFoundException(
          this.error("WAGE_ITEM_NOT_FOUND", "Wage item not found"),
        );
      }
      if (
        error instanceof Error &&
        error.message === "WAGE_PAYMENT_AMOUNT_INVALID"
      ) {
        throw new BadRequestException(
          this.error(
            "WAGE_PAYMENT_AMOUNT_INVALID",
            "Adjusted net payable cannot be less than the amount already paid",
          ),
        );
      }
      if (
        error instanceof Error &&
        error.message === "WAGE_BATCH_STATUS_INVALID"
      ) {
        throw new BadRequestException(
          this.error(
            "WAGE_BATCH_STATUS_INVALID",
            "Wage items cannot be updated for this wage batch status",
          ),
        );
      }
      throw error;
    }
  }

  private async buildPreview(
    organizationId: string,
    projectId: string,
    periodStart: string,
    periodEnd: string,
  ): Promise<WagePreview> {
    const rows = await this.wagesRepo.previewRows(
      organizationId,
      projectId,
      periodStart,
      periodEnd,
    );
    const items = rows.map((row) => {
      const dailyRate = row.daily_rate === null ? null : String(row.daily_rate);
      const rateCents = dailyRate === null ? null : this.toCents(dailyRate);
      const presentDays = Number(row.present_days ?? 0);
      const halfDays = Number(row.half_days ?? 0);
      const holidayDays = Number(row.holiday_days ?? 0);
      const absentDays = Number(row.absent_days ?? 0);
      const grossCents =
        rateCents === null
          ? 0
          : rateCents * presentDays + Math.round(rateCents * 0.5 * halfDays);
      const kharchiDeductionCents = 0;
      const adjustmentCents = 0;
      const netCents = grossCents - kharchiDeductionCents + adjustmentCents;
      return {
        workerAssignmentId: row.worker_assignment_id,
        workerId: row.worker_id,
        workerCode: row.worker_code,
        workerName: row.worker_name,
        trade: row.trade,
        dailyRate,
        presentDays,
        halfDays,
        holidayDays,
        absentDays,
        grossAmount: this.formatMoney(grossCents),
        kharchiDeduction: this.formatMoney(kharchiDeductionCents),
        adjustmentAmount: this.formatMoney(adjustmentCents),
        netAmount: this.formatMoney(netCents),
        isReady: rateCents !== null,
        readinessIssue: rateCents === null ? "Daily rate is required" : null,
      } satisfies WagePreviewItem;
    });

    return {
      periodStart,
      periodEnd,
      items,
      totals: {
        grossAmount: this.sumMoney(items, "grossAmount"),
        kharchiDeduction: this.sumMoney(items, "kharchiDeduction"),
        adjustmentAmount: this.sumMoney(items, "adjustmentAmount"),
        netAmount: this.sumMoney(items, "netAmount"),
      },
    };
  }

  private validatePeriod(periodStart: string, periodEnd: string) {
    if (periodEnd < periodStart) {
      throw new BadRequestException(
        this.error(
          "VALIDATION_FAILED",
          "Wage period end date cannot be before start date",
        ),
      );
    }
  }

  private sumMoney(
    items: WagePreviewItem[],
    field: "grossAmount" | "kharchiDeduction" | "adjustmentAmount" | "netAmount",
  ) {
    return this.formatMoney(
      items.reduce((sum, item) => sum + this.toCents(item[field]), 0),
    );
  }

  private toCents(value: string) {
    const trimmed = value.trim();
    const sign = trimmed.startsWith("-") ? -1 : 1;
    const unsigned = trimmed.replace(/^[+-]/, "");
    const [rupees = "0", paise = ""] = unsigned.split(".");
    return sign * (Number(rupees) * 100 + Number(paise.padEnd(2, "0").slice(0, 2)));
  }

  private formatMoney(cents: number) {
    const sign = cents < 0 ? "-" : "";
    const absolute = Math.abs(cents);
    return `${sign}${Math.trunc(absolute / 100)}.${String(absolute % 100).padStart(2, "0")}`;
  }

  private toCsv(detail: Awaited<ReturnType<WagesRepository["findBatchDetail"]>>) {
    if (!detail) return "";
    const itemHeaders = [
      "Worker Code",
      "Worker Name",
      "Trade",
      "Period Start",
      "Period End",
      "Present Days",
      "Half Days",
      "Holiday Days",
      "Absent Days",
      "Daily Rate",
      "Gross Amount",
      "Kharchi Deduction",
      "Adjustment Amount",
      "Net Amount",
      "Paid Amount",
      "Payment Status",
      "Notes",
    ];
    const paymentHeaders = [
      "Worker Code",
      "Worker Name",
      "Payment Date",
      "Amount",
      "Payment Method",
      "Reference",
      "Recorded At",
    ];
    const itemLines = [
      itemHeaders.map((header) => this.csvCell(header)).join(","),
      ...detail.items.map((item) =>
        [
          item.workerCode,
          item.workerName,
          item.trade,
          detail.periodStart,
          detail.periodEnd,
          item.presentDays,
          item.halfDays,
          item.holidayDays,
          item.absentDays,
          item.dailyRate,
          item.grossAmount,
          item.kharchiDeduction,
          item.adjustmentAmount,
          item.netAmount,
          item.paidAmount,
          item.paymentStatus,
          item.notes ?? "",
        ]
          .map((value) => this.csvCell(value))
          .join(","),
      ),
      "",
      this.csvCell("Payment History"),
      paymentHeaders.map((header) => this.csvCell(header)).join(","),
      ...detail.payments.map((payment) => {
        const item = detail.items.find((candidate) => candidate.id === payment.wageItemId);
        return [
          item?.workerCode ?? "",
          item?.workerName ?? "",
          payment.paymentDate,
          payment.amount,
          payment.paymentMethod,
          payment.reference ?? "",
          payment.recordedAt,
        ]
          .map((value) => this.csvCell(value))
          .join(",");
      }),
    ];
    return `${itemLines.join("\r\n")}\r\n`;
  }

  private csvCell(value: string | number | boolean | null | undefined) {
    const text = value === null || value === undefined ? "" : String(value);
    return `"${text.replace(/"/g, '""')}"`;
  }

  private error(code: ErrorCode, message: string) {
    return { code, message };
  }
}
