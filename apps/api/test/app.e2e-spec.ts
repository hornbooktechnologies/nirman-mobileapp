import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication, ValidationPipe } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import type { Server } from "node:http";
import request from "supertest";
import { AppModule } from "../src/app.module";
import { DatabaseService } from "../src/database/database.service";
import { NotificationsPushWorker } from "../src/modules/notifications/notifications-push.worker";
import { JwtAuthGuard } from "../src/modules/auth/guards/jwt-auth.guard";
import { GlobalExceptionFilter } from "../src/common/filters/global-exception.filter";

describe("AppController (e2e)", () => {
  let app: INestApplication<Server>;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(DatabaseService)
      .useValue({ ping: jest.fn().mockResolvedValue(undefined) })
      .overrideProvider(NotificationsPushWorker)
      .useValue({ onModuleInit: jest.fn(), onModuleDestroy: jest.fn() })
      .compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix("api/v1");
    app.useGlobalGuards(new JwtAuthGuard(app.get(Reflector)));
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

  it("/health (GET)", () => {
    return request(app.getHttpServer()).get("/api/v1/health").expect(200);
  });

  it.each(["login", "forgot-password", "reset-password"])(
    "rejects invalid public %s input before database access",
    (action) => {
      return request(app.getHttpServer())
        .post(`/api/v1/auth/${action}`)
        .send({})
        .expect(400);
    },
  );

  const project = "organizations/test-org/projects/test-project";
  it.each([
    "auth/me",
    "auth/session",
    "users",
    "roles",
    "settings",
    "organizations",
    "platform/subscription-plans",
    "platform/website-enquiries",
    "organizations/test-org/members",
    "organizations/test-org/projects",
    "organizations/test-org/workers",
    "organizations/test-org/work-calendar",
    "organizations/test-org/notifications",
    "organizations/test-org/project-access/me",
    ...[
      "context",
      "members",
      "workers",
      "work-calendar",
      "dashboard",
      "attendance",
      "attendance/summary",
      "attendance/export",
      "attendance/export/pdf",
      "wages/preview",
      "wages/batches",
      "kharchi",
      "kharchi/summary",
      "kharchi/export",
      "materials",
      "materials/summary",
      "materials/settings",
      "materials/export",
      "expenses",
      "expenses/summary",
      "expenses/settings",
      "expenses/export",
      "total-expenses",
      "total-expenses/summary",
      "progress/summary",
      "progress/history",
      "gallery/entries",
      "gallery/summary",
      "brochures",
      "brochures/shares/history",
      "sales/leads",
      "sales/follow-ups",
      "sales/site-visits",
      "sales/units",
      "sales/bookings",
    ].map((route) => `${project}/${route}`),
  ])("denies anonymous and invalid-token access to GET /%s", async (route) => {
    const server = app.getHttpServer();
    for (const token of [undefined, "invalid-token"]) {
      const call = request(server).get(`/api/v1/${route}`);
      if (token) call.set("Authorization", `Bearer ${token}`);
      const response = await call.expect(401);
      expect(response.body).toMatchObject({
        success: false,
        error: { code: "AUTH_SESSION_REQUIRED" },
      });
    }
  });
});
