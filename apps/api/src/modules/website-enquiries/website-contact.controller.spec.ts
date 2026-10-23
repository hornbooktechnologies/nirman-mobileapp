import type { Server } from "node:http";
import { Test } from "@nestjs/testing";
import type { INestApplication } from "@nestjs/common";
import request from "supertest";
import { WebsiteContactController } from "./website-contact.controller";
import { WebsiteContactService } from "./website-contact.service";

describe("Public contact HTTP boundary", () => {
  let app: INestApplication<Server>;
  const service = { submit: jest.fn() };
  const original = { ...process.env };
  beforeEach(async () => {
    process.env.WEBSITE_URL = "https://nirmansite.com";
    service.submit.mockReset().mockResolvedValue({
      status: 200,
      body: { ok: true, teamEmailSent: true, confirmationEmailSent: true },
    });
    const module = await Test.createTestingModule({
      controllers: [WebsiteContactController],
      providers: [{ provide: WebsiteContactService, useValue: service }],
    }).compile();
    app = module.createNestApplication();
    app.setGlobalPrefix("api/v1");
    await app.init();
  });
  afterEach(async () => {
    await app.close();
    process.env = { ...original };
  });
  it("accepts the configured website origin over an internal proxy connection", async () => {
    const response = await request(app.getHttpServer())
      .post("/api/v1/public/contact")
      .set("Origin", "https://nirmansite.com")
      .send({ name: "Test" });
    expect(response.status).toBe(200);
    expect(
      (response.body as { confirmationEmailSent: boolean })
        .confirmationEmailSent,
    ).toBe(true);
  });
  it.each([
    undefined,
    "null",
    "https://nirmansite.com.evil.test",
    "https://nirmansite.com/path",
  ])("rejects unapproved origin %s", async (origin) => {
    const req = request(app.getHttpServer()).post("/api/v1/public/contact");
    if (origin) req.set("Origin", origin);
    expect((await req.send({ name: "Test" })).status).toBe(403);
    expect(service.submit).not.toHaveBeenCalled();
  });
  it("accepts URL-encoded fallback forms and redirects to the configured site", async () => {
    const response = await request(app.getHttpServer())
      .post("/api/v1/public/contact")
      .set("Origin", "https://nirmansite.com")
      .type("form")
      .send({
        "Full name": "Test Customer",
        "Email address": "customer@example.test",
      });
    expect(response.status).toBe(303);
    expect(response.headers.location).toBe(
      "https://nirmansite.com/contact?send=sent",
    );
    expect(service.submit).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "Test Customer",
        email: "customer@example.test",
      }),
    );
  });
  it("bounds payloads before processing", async () => {
    const response = await request(app.getHttpServer())
      .post("/api/v1/public/contact")
      .set("Origin", "https://nirmansite.com")
      .send({ message: "x".repeat(6100) });
    expect(response.status).toBe(413);
    expect(service.submit).not.toHaveBeenCalled();
  });
  it("throttles repeated submissions without additional storage work", async () => {
    for (let i = 0; i < 20; i++)
      await request(app.getHttpServer())
        .post("/api/v1/public/contact")
        .set("Origin", "https://nirmansite.com")
        .send({ email: "customer@example.test" })
        .expect(200);
    await request(app.getHttpServer())
      .post("/api/v1/public/contact")
      .set("Origin", "https://nirmansite.com")
      .send({ email: "customer@example.test" })
      .expect(429);
    expect(service.submit).toHaveBeenCalledTimes(20);
  });
});
