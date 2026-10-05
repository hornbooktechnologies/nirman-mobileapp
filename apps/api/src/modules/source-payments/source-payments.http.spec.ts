import {
  type INestApplication,
  ValidationPipe,
  ForbiddenException,
  ConflictException,
} from "@nestjs/common";
import { Test } from "@nestjs/testing";
import type { Server } from "node:http";
import type { Request, Response, NextFunction } from "express";
import request from "supertest";
import { GlobalExceptionFilter } from "../../common/filters/global-exception.filter";
import type { AuthenticatedUser } from "../auth/types/auth.types";
import { CalendarRepository } from "../calendar/calendar.repository";
import { ProjectAccessService } from "../project-access/project-access.service";
import { ExpensePaymentsController } from "./source-payments.controller";
import { SourcePaymentsRepository } from "./source-payments.repository";
import { SourcePaymentsService } from "./source-payments.service";

// Real HTTP routing, permission guard, DTO pipe and service; repositories are isolated.
describe("expense payment HTTP contract", () => {
  let app: INestApplication;
  let actor: AuthenticatedUser;
  const org = "00000000-0000-4000-8000-000000000010";
  const project = "00000000-0000-4000-8000-000000000020";
  const expense = "00000000-0000-4000-8000-000000000030";
  const payment = "00000000-0000-4000-8000-000000000040";
  const path = `/api/v1/organizations/${org}/projects/${project}/expenses/${expense}/payments`;
  const ledger = {
    version: 4,
    paidAmount: "25.00",
    remainingAmount: "75.00",
    paymentStatus: "PARTIALLY_PAID",
    payments: [],
  };
  const repo = { command: jest.fn() };
  const access = { resolveProjectAccess: jest.fn() };
  const calendar = {
    findOrganizationWorkingTimezone: jest
      .fn()
      .mockResolvedValue("Asia/Kolkata"),
  };
  const body = () => ({
    amount: "25.00",
    paymentDate: "2026-09-20",
    paymentMethod: "CASH",
    reference: "Receipt",
    expectedVersion: 3,
    idempotencyKey: "http-payment-001",
  });
  beforeAll(async () => {
    const module = await Test.createTestingModule({
      controllers: [ExpensePaymentsController],
      providers: [
        SourcePaymentsService,
        { provide: SourcePaymentsRepository, useValue: repo },
        { provide: ProjectAccessService, useValue: access },
        { provide: CalendarRepository, useValue: calendar },
      ],
    }).compile();
    app = module.createNestApplication();
    app.setGlobalPrefix("api/v1");
    app.use(
      (
        req: Request & { user?: AuthenticatedUser },
        _res: Response,
        next: NextFunction,
      ) => {
        req.user = actor;
        next();
      },
    );
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    app.useGlobalFilters(new GlobalExceptionFilter());
    await app.init();
  });
  afterAll(async () => {
    await app.close();
  });
  beforeEach(() => {
    jest.clearAllMocks();
    actor = {
      id: "owner",
      permissions: [
        { resource: "expenses", action: "mark-paid" },
        { resource: "expenses", action: "void-payment" },
      ],
    } as AuthenticatedUser;
    repo.command.mockResolvedValue(ledger);
    access.resolveProjectAccess.mockResolvedValue({
      project: { status: "ACTIVE" },
    });
  });
  const http = () => request(app.getHttpServer() as Server);
  it("returns the updated decimal-string ledger for the mobile/web request", async () => {
    const response = await http().post(path).send(body()).expect(201);
    expect(response.body).toEqual({ success: true, data: ledger });
    expect(repo.command).toHaveBeenCalledWith(
      "expenses",
      org,
      project,
      expense,
      undefined,
      actor.id,
      expect.objectContaining(body()),
      undefined,
    );
  });
  it.each([
    { amount: "1.001" },
    { amount: "1000000000000" },
    { expectedVersion: 0 },
    { paymentMethod: "INVALID" },
    { status: "PAID" },
  ])(
    "rejects invalid or extra input %j before financial writes",
    async (invalid) => {
      const response = await http()
        .post(path)
        .send({ ...body(), ...invalid })
        .expect(400);
      expect((response.body as { error: { code: string } }).error.code).toBe(
        "VALIDATION_FAILED",
      );
      expect(repo.command).not.toHaveBeenCalled();
    },
  );
  it("returns the stable invalid-amount error for zero", async () => {
    const response = await http()
      .post(path)
      .send({ ...body(), amount: "0.00" })
      .expect(400);
    expect((response.body as { error: { code: string } }).error.code).toBe(
      "PAYMENT_AMOUNT_INVALID",
    );
    expect(repo.command).not.toHaveBeenCalled();
  });
  it("returns the stable invalid-date error for an impossible calendar date", async () => {
    const response = await http()
      .post(path)
      .send({ ...body(), paymentDate: "2026-02-30" })
      .expect(400);
    expect((response.body as { error: { code: string } }).error.code).toBe(
      "PAYMENT_DATE_INVALID",
    );
    expect(repo.command).not.toHaveBeenCalled();
  });
  it("denies a missing global payment permission", async () => {
    actor.permissions = [];
    await http().post(path).send(body()).expect(403);
    expect(repo.command).not.toHaveBeenCalled();
  });
  it("denies effective project/source-read access before repository writes", async () => {
    access.resolveProjectAccess.mockRejectedValueOnce(
      new ForbiddenException("Project access denied"),
    );
    await http().post(path).send(body()).expect(403);
    expect(repo.command).not.toHaveBeenCalled();
  });
  it("preserves the stale-version error for client reload and review", async () => {
    repo.command.mockRejectedValueOnce(
      new ConflictException({
        code: "PAYMENT_VERSION_CONFLICT",
        message: "Record changed",
      }),
    );
    const response = await http().post(path).send(body()).expect(409);
    expect((response.body as { error: { code: string } }).error.code).toBe(
      "PAYMENT_VERSION_CONFLICT",
    );
  });
  it("routes a reasoned void to the same scoped expense", async () => {
    const input = {
      reason: "Wrong amount",
      expectedVersion: 4,
      idempotencyKey: "http-void-001",
    };
    await http().post(`${path}/${payment}/void`).send(input).expect(201);
    expect(repo.command).toHaveBeenCalledWith(
      "expenses",
      org,
      project,
      expense,
      undefined,
      actor.id,
      expect.objectContaining(input),
      payment,
    );
  });
});
