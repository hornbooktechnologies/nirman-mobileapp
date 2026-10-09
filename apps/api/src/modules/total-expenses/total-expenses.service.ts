import {
  isMissingPaymentSchema,
  paymentSchemaError,
} from "../source-payments/payment-schema";
import {
  Injectable,
  BadRequestException,
  ServiceUnavailableException,
} from "@nestjs/common";
import { isCalendarDate } from "@nirman-app/shared";
import { ProjectAccessService } from "../project-access/project-access.service";
import type { AuthenticatedUser } from "../auth/types/auth.types";
import { TotalExpensesRepository } from "./total-expenses.repository";
import { TotalExpensesQueryDto } from "./total-expenses.dto";
@Injectable()
export class TotalExpensesService {
  constructor(
    private readonly repo: TotalExpensesRepository,
    private readonly access: ProjectAccessService,
  ) {}
  async read(
    org: string,
    project: string,
    actor: AuthenticatedUser,
    q: TotalExpensesQueryDto,
    summary: boolean | "materials" = false,
  ) {
    await this.access.resolveProjectAccess(
      actor,
      org,
      project,
      "total-expenses:read",
    );
    if (
      Boolean(q.startDate) !== Boolean(q.endDate) ||
      (q.startDate &&
        (!isCalendarDate(q.startDate) ||
          !isCalendarDate(q.endDate!) ||
          q.endDate! < q.startDate))
    )
      throw new BadRequestException({
        code: "VALIDATION_FAILED",
        message:
          "Provide a valid inclusive start and end date, or omit both for all time",
      });
    try {
      return await (summary === "materials"
        ? this.repo.materials(org, project, q)
        : summary
          ? this.repo.summary(org, project, q)
          : this.repo.list(org, project, q));
    } catch (error) {
      if (isMissingPaymentSchema(error))
        throw new ServiceUnavailableException(paymentSchemaError);
      throw error;
    }
  }
}
