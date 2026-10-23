import nodemailer from "nodemailer";
import { EmailService } from "./email.service";
import { SettingsService } from "../settings/settings.service";
jest.mock("nodemailer", () => ({
  __esModule: true,
  default: { createTransport: jest.fn() },
}));

describe("Contact SMTP delivery", () => {
  const sendMail = jest.fn<Promise<unknown>, [Record<string, unknown>]>();
  const close = jest.fn();
  const settings = { getAll: jest.fn() };
  const service = new EmailService(settings as unknown as SettingsService);
  const enquiry = {
    name: "<Test>",
    phone: "9876543210",
    email: "customer@example.test",
    organizationType: "BUILDER" as const,
    message: "<script>unsafe</script>",
  };
  beforeEach(() => {
    jest.resetAllMocks();
    settings.getAll.mockResolvedValue({
      email: {
        smtpHost: "mail.example.test",
        smtpPort: "465",
        smtpUsername: "contact@nirmansite.com",
        smtpPassword: "test-only",
        smtpEncryption: "ssl",
        mailFromAddress: "contact@nirmansite.com",
        mailFromName: "NirmanSite",
      },
    });
    (nodemailer.createTransport as jest.Mock).mockReturnValue({
      sendMail,
      close,
    });
  });
  it("uses the API sender for both emails and escapes customer HTML", async () => {
    sendMail.mockResolvedValue({});
    expect(await service.sendContactEmails(enquiry)).toEqual({
      teamEmailSent: true,
      confirmationEmailSent: true,
    });
    expect(sendMail).toHaveBeenCalledTimes(2);
    const messages = sendMail.mock.calls.map(
      (call) => call[0] as { from: { address: string }; html: string },
    );
    for (const message of messages) {
      expect(message.from.address).toBe("contact@nirmansite.com");
      expect(message.html).not.toContain("<script>");
      expect(message.html).not.toContain("cid:");
    }
    expect(close).toHaveBeenCalled();
  });
  it("attempts customer confirmation even if the internal notification fails", async () => {
    sendMail
      .mockRejectedValueOnce(new Error("relay refused"))
      .mockResolvedValueOnce({});
    expect(await service.sendContactEmails(enquiry)).toEqual({
      teamEmailSent: false,
      confirmationEmailSent: true,
    });
    expect(close).toHaveBeenCalled();
  });
  it("reports a confirmation failure without losing team delivery", async () => {
    sendMail
      .mockResolvedValueOnce({})
      .mockRejectedValueOnce(new Error("recipient refused"));
    expect(await service.sendContactEmails(enquiry)).toEqual({
      teamEmailSent: true,
      confirmationEmailSent: false,
    });
  });
});
