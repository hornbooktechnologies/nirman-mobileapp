/* eslint-disable @typescript-eslint/unbound-method */
import type { ResultSetHeader } from "mysql2/promise";
import { DatabaseService } from "../../database/database.service";
import type { DatabaseTransaction } from "../../database/database.types";
import { AuditService } from "../audit/audit.service";
import { SalesRepository } from "./sales.repository";

describe("SalesRepository booking linkage", () => {
  const connection = {} as DatabaseTransaction;
  const database = {
    query: jest.fn(),
    execute: jest.fn(),
    transaction: jest.fn(),
  } as unknown as jest.Mocked<DatabaseService>;
  const audit = {
    record: jest.fn(),
  } as unknown as jest.Mocked<AuditService>;
  const repository = new SalesRepository(database, audit);

  beforeEach(() => {
    jest.clearAllMocks();
    database.transaction.mockImplementation(async (callback) =>
      callback(connection),
    );
    database.execute.mockResolvedValue({ affectedRows: 1 } as ResultSetHeader);
    audit.record.mockResolvedValue("00000000-0000-4000-8000-000000000099");
  });

  it("uses the locked Lead snapshot and records confirmation audit atomically", async () => {
    database.query
      .mockResolvedValueOnce([] as never)
      .mockResolvedValueOnce([
        {
          current_stage: "NEGOTIATION",
          customer_name: "Server Customer",
          primary_mobile: "9876543210",
          source: "REFERRAL",
        },
      ] as never)
      .mockResolvedValueOnce([
        {
          id: "booking-id",
          leadId: "lead-id",
          unitId: null,
          status: "CONFIRMED",
          bookingAmount: "100000.00",
        },
      ] as never);

    await repository.createBooking(
      "organization-id",
      "project-id",
      {
        idempotencyKey: "booking-request-001",
        leadId: "lead-id",
        bookingDate: "2026-09-03",
        customerName: "Untrusted Client Name",
        customerMobile: "1111111111",
        bookingAmount: 100000,
      },
      "actor-id",
    );

    const insert = database.execute.mock.calls.find(([sql]) =>
      sql.includes("INSERT INTO sales_bookings"),
    );
    expect(insert?.[1]).toEqual(
      expect.arrayContaining([
        "Server Customer",
        "9876543210",
        "REFERRAL",
        "NEGOTIATION",
      ]),
    );
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "sales.booking-confirmed",
        entityType: "sales_booking",
        oldValues: { leadStage: "NEGOTIATION", unitStatus: null },
        newValues: {
          status: "CONFIRMED",
          leadStage: "BOOKED",
          unitStatus: null,
        },
      }),
      connection,
    );
  });

  it("returns the existing booking after a concurrent identical retry", async () => {
    database.transaction.mockRejectedValueOnce(
      Object.assign(new Error("duplicate"), { code: "ER_DUP_ENTRY" }),
    );
    const dto = {
      idempotencyKey: "booking-request-002",
      leadId: "lead-id",
      bookingDate: "2026-09-03",
    };
    const fingerprint = (
      repository as unknown as {
        bookingFingerprint: (projectId: string, input: typeof dto) => string;
      }
    ).bookingFingerprint("project-id", dto);
    database.query
      .mockResolvedValueOnce([
        {
          id: "existing-booking-id",
          request_fingerprint: fingerprint,
          project_id: "project-id",
          lead_id: "lead-id",
          unit_id: null,
          booking_date: "2026-09-03",
          booking_amount: null,
          booking_reference: null,
        },
      ] as never)
      .mockResolvedValueOnce([
        {
          id: "existing-booking-id",
          leadId: "lead-id",
          unitId: null,
          status: "CONFIRMED",
          bookingAmount: null,
        },
      ] as never);

    await expect(
      repository.createBooking(
        "organization-id",
        "project-id",
        dto,
        "actor-id",
      ),
    ).resolves.toEqual(expect.objectContaining({ id: "existing-booking-id" }));
    expect(audit.record).not.toHaveBeenCalled();
  });

  it("stores explicit restoration choices and records cancellation audit", async () => {
    database.query
      .mockResolvedValueOnce([
        {
          lead_id: "lead-id",
          unit_id: "unit-id",
          status: "CONFIRMED",
          current_lead_stage: "BOOKED",
          current_unit_status: "BOOKED",
        },
      ] as never)
      .mockResolvedValueOnce([
        {
          id: "booking-id",
          leadId: "lead-id",
          unitId: "unit-id",
          status: "CANCELLED",
          bookingAmount: null,
        },
      ] as never);

    await repository.cancelBooking(
      "organization-id",
      "project-id",
      "booking-id",
      {
        cancellationReason: "Customer withdrew",
        restoredLeadStage: "FOLLOW_UP_LATER",
        restoredUnitStatus: "AVAILABLE",
      },
      "actor-id",
    );

    const bookingUpdate = database.execute.mock.calls.find(([sql]) =>
      sql.includes("UPDATE sales_bookings SET status = 'CANCELLED'"),
    );
    expect(bookingUpdate?.[1]).toEqual([
      "Customer withdrew",
      "FOLLOW_UP_LATER",
      "AVAILABLE",
      "actor-id",
      "booking-id",
    ]);
    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "sales.booking-cancelled",
        oldValues: {
          status: "CONFIRMED",
          leadStage: "BOOKED",
          unitStatus: "BOOKED",
        },
        newValues: {
          status: "CANCELLED",
          leadStage: "FOLLOW_UP_LATER",
          unitStatus: "AVAILABLE",
        },
      }),
      connection,
    );
  });
});
