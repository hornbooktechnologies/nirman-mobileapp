import { CalendarRepository } from "../calendar/calendar.repository";
/* eslint-disable @typescript-eslint/unbound-method */
import { SourcePaymentsService } from "./source-payments.service";
import { SourcePaymentsRepository } from "./source-payments.repository";
import { ProjectAccessService } from "../project-access/project-access.service";
import type { AuthenticatedUser } from "../auth/types/auth.types";
import { RecordPaymentDto } from "./source-payments.dto";
describe("payment authorization and calendar date", () => {
  const repo = {
    command: jest.fn(),
  } as unknown as jest.Mocked<SourcePaymentsRepository>;
  const access = {
    resolveProjectAccess: jest.fn(),
  } as unknown as jest.Mocked<ProjectAccessService>;
  const calendar = {
    findOrganizationWorkingTimezone: jest
      .fn()
      .mockResolvedValue("Asia/Kolkata"),
  } as unknown as jest.Mocked<CalendarRepository>;
  const service = new SourcePaymentsService(repo, access, calendar);
  const actor = { id: "owner" } as AuthenticatedUser;
  beforeEach(() => {
    jest.clearAllMocks();
    calendar.findOrganizationWorkingTimezone.mockResolvedValue("Asia/Kolkata");
    access.resolveProjectAccess.mockResolvedValue({
      organization: { timezone: "Asia/Kolkata" },
      project: { status: "ACTIVE" },
    } as never);
    jest.useFakeTimers().setSystemTime(new Date("2026-10-05T06:00:00Z"));
  });
  afterEach(() => jest.useRealTimers());
  const dto = () =>
    Object.assign(new RecordPaymentDto(), {
      amount: "25.00",
      paymentDate: "2026-09-20",
      paymentMethod: "CASH",
      expectedVersion: 1,
      idempotencyKey: "payment-key-001",
    });
  it("requires source read and payment write permission", async () => {
    await service.command(
      "materials",
      "org",
      "project",
      "purchase",
      "request",
      actor,
      dto(),
    );
    expect(access.resolveProjectAccess.mock.calls.map((c) => c[3])).toEqual([
      "materials:mark-paid",
    ]);
    expect(access.resolveProjectAccess.mock.calls[0][4]).toEqual([
      "materials:read",
    ]);
  });
  it.each(["2026-10-06", "2026-02-30"])(
    "rejects future/invalid date %s",
    async (date) => {
      await expect(
        service.command(
          "expenses",
          "org",
          "project",
          "expense",
          undefined,
          actor,
          { ...dto(), paymentDate: date },
        ),
      ).rejects.toThrow("Payment date");
      expect(repo.command).not.toHaveBeenCalled();
    },
  );
  it("rejects writes to non-active projects", async () => {
    access.resolveProjectAccess.mockResolvedValue({
      organization: { timezone: "Asia/Kolkata" },
      project: { status: "ARCHIVED" },
    } as never);
    await expect(
      service.command(
        "expenses",
        "org",
        "project",
        "expense",
        undefined,
        actor,
        dto(),
      ),
    ).rejects.toThrow("active project");
    expect(repo.command).not.toHaveBeenCalled();
  });
  it("uses the effective working timezone rather than the base organization timezone", async () => {
    jest.setSystemTime(new Date("2026-10-05T00:30:00Z"));
    calendar.findOrganizationWorkingTimezone.mockResolvedValue(
      "America/Los_Angeles",
    );
    await expect(
      service.command(
        "expenses",
        "org",
        "project",
        "expense",
        undefined,
        actor,
        { ...dto(), paymentDate: "2026-10-05" },
      ),
    ).rejects.toThrow("Payment date");
    expect(repo.command).not.toHaveBeenCalled();
  });
  it.each(["0", "0.00", "-1.00", "1.001", "1e2", "1000000000000", "invalid"])(
    "rejects invalid payment amount %s before repository writes",
    async (amount) => {
      await expect(
        service.command(
          "expenses",
          "org",
          "project",
          "expense",
          undefined,
          actor,
          { ...dto(), amount },
        ),
      ).rejects.toMatchObject({ response: { code: "PAYMENT_AMOUNT_INVALID" } });
      expect(repo.command).not.toHaveBeenCalled();
    },
  );
  it("passes a valid expense payment to the scoped repository", async () => {
    await service.command(
      "expenses",
      "org",
      "project",
      "expense",
      undefined,
      actor,
      dto(),
    );
    expect(access.resolveProjectAccess).toHaveBeenCalledWith(
      actor,
      "org",
      "project",
      "expenses:mark-paid",
      ["expenses:read"],
    );
    expect(repo.command).toHaveBeenCalledWith(
      "expenses",
      "org",
      "project",
      "expense",
      undefined,
      actor.id,
      dto(),
      undefined,
    );
  });
});
