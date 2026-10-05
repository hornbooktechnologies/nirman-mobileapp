import { CalendarRepository } from "../calendar/calendar.repository";
import { isMissingPaymentSchema, paymentSchemaError } from "./payment-schema";
import {
  Injectable,
  ServiceUnavailableException,
  BadRequestException,
  ConflictException,
} from "@nestjs/common";
import {
  calendarToday,
  isCalendarDate,
  moneyPaise,
  type PermissionKey,
} from "@nirman-app/shared";
import { ProjectAccessService } from "../project-access/project-access.service";
import type { AuthenticatedUser } from "../auth/types/auth.types";
import {
  SourcePaymentsRepository,
  type PaymentSource,
} from "./source-payments.repository";
import { RecordPaymentDto, VoidPaymentDto } from "./source-payments.dto";
@Injectable()
export class SourcePaymentsService {
  constructor(
    private readonly repo: SourcePaymentsRepository,
    private readonly access: ProjectAccessService,
    private readonly calendar: CalendarRepository,
  ) {}
  async command(
    source: PaymentSource,
    org: string,
    project: string,
    id: string,
    parent: string | undefined,
    actor: AuthenticatedUser,
    dto: RecordPaymentDto | VoidPaymentDto,
    paymentId?: string,
  ) {
    const access = await this.access.resolveProjectAccess(
      actor,
      org,
      project,
      `${source}:${paymentId ? "void-payment" : "mark-paid"}` as PermissionKey,
      [`${source}:read` as PermissionKey],
    );
    if (access.project.status !== "ACTIVE")
      throw new BadRequestException({
        code: "PROJECT_STATUS_INVALID",
        message: "Payments require an active project",
      });
    if (!paymentId) {
      const amount = (dto as RecordPaymentDto).amount;
      if (
        typeof amount !== "string" ||
        !/^\d{1,12}(?:\.\d{1,2})?$/.test(amount) ||
        moneyPaise(amount) <= 0n
      )
        throw new BadRequestException({
          code: "PAYMENT_AMOUNT_INVALID",
          message:
            "Payment must be a positive decimal amount with at most two decimal places",
        });
    }
    if (
      !paymentId &&
      (!isCalendarDate((dto as RecordPaymentDto).paymentDate) ||
        (dto as RecordPaymentDto).paymentDate >
          calendarToday(
            await this.calendar.findOrganizationWorkingTimezone(org),
          ))
    )
      throw new BadRequestException({
        code: "PAYMENT_DATE_INVALID",
        message:
          "Payment date must be a valid date and cannot be in the future",
      });
    try {
      return await this.repo.command(
        source,
        org,
        project,
        id,
        parent,
        actor.id,
        dto,
        paymentId,
      );
    } catch (error) {
      if (isMissingPaymentSchema(error))
        throw new ServiceUnavailableException(paymentSchemaError);
      if ((error as { code?: string }).code === "ER_DUP_ENTRY")
        throw new ConflictException({
          code: "PAYMENT_IDEMPOTENCY_CONFLICT",
          message: "Concurrent retry conflicted. Retry with the same key.",
        });
      throw error;
    }
  }
}
