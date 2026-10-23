/* eslint-disable @typescript-eslint/no-unsafe-assignment -- Jest asymmetric matchers are intentionally untyped. */
import { WebsiteContactService } from "./website-contact.service";
import { WebsiteEnquiriesRepository } from "./website-enquiries.repository";
import { EmailService } from "../email/email.service";

describe("Website contact workflow", () => {
  const input = {
    name: "Test Customer",
    phone: "9876543210",
    email: "CUSTOMER@example.test",
    organizationType: "BUILDER",
    message: "Please call",
  };
  const repository = { create: jest.fn() };
  const email = { sendContactEmails: jest.fn() };
  const service = new WebsiteContactService(
    repository as unknown as WebsiteEnquiriesRepository,
    email as unknown as EmailService,
  );
  beforeEach(() => {
    jest.resetAllMocks();
  });
  it("saves before mailing and normalizes the email", async () => {
    repository.create.mockResolvedValue({ id: "saved" });
    email.sendContactEmails.mockImplementation(() => {
      expect(repository.create).toHaveBeenCalled();
      return Promise.resolve({
        teamEmailSent: true,
        confirmationEmailSent: true,
      });
    });
    const result = await service.submit(input);
    expect(result.body).toEqual({
      ok: true,
      teamEmailSent: true,
      confirmationEmailSent: true,
    });
    expect(repository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        email: "customer@example.test",
        submissionKey: expect.any(String),
      }),
    );
  });
  it("never emails when storage fails", async () => {
    repository.create.mockRejectedValue(new Error("database unavailable"));
    expect((await service.submit(input)).status).toBe(503);
    expect(email.sendContactEmails).not.toHaveBeenCalled();
  });
  it("keeps the saved response successful when SMTP is unavailable", async () => {
    repository.create.mockResolvedValue({ id: "saved" });
    email.sendContactEmails.mockResolvedValue({
      teamEmailSent: false,
      confirmationEmailSent: false,
    });
    expect((await service.submit(input)).body).toEqual({
      ok: true,
      teamEmailSent: false,
      confirmationEmailSent: false,
    });
  });
  it("silently discards the honeypot without database or email work", async () => {
    expect((await service.submit({ website: "bot" })).body).toEqual({
      ok: true,
    });
    expect(repository.create).not.toHaveBeenCalled();
    expect(email.sendContactEmails).not.toHaveBeenCalled();
  });
  it("rejects invalid phone and organization fields", async () => {
    const result = await service.submit({
      ...input,
      phone: "123",
      organizationType: "OTHER",
    });
    expect(result.status).toBe(400);
    expect(result.body.fieldErrors).toEqual(
      expect.objectContaining({
        phone: expect.any(String),
        organizationType: expect.any(String),
      }),
    );
    expect(repository.create).not.toHaveBeenCalled();
  });
});
