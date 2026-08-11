import { Injectable, Logger } from "@nestjs/common";
import type { InvitationDeliveryStatus } from "@nirman-app/shared";
import nodemailer from "nodemailer";
import { SettingsService } from "../settings/settings.service";
import {
  buildOrganizationOwnerInvitationEmail,
  type OrganizationOwnerInvitationEmailInput,
} from "./invitation-email.template";

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  constructor(private readonly settingsService: SettingsService) {}

  async sendOrganizationOwnerInvitation(
    invitationId: string,
    input: OrganizationOwnerInvitationEmailInput,
  ): Promise<InvitationDeliveryStatus> {
    try {
      const settings = await this.settingsService.getAll();
      const smtp = this.resolveSmtpSettings(settings.email);
      if (!smtp) {
        this.logger.log(
          `Invitation ${invitationId} remains manual because SMTP is not configured`,
        );
        return "MANUAL";
      }

      const transport = nodemailer.createTransport({
        host: smtp.host,
        port: smtp.port,
        secure: smtp.secure,
        requireTLS: smtp.requireTls,
        auth: smtp.username
          ? { user: smtp.username, pass: smtp.password }
          : undefined,
        connectionTimeout: 10_000,
        greetingTimeout: 10_000,
        socketTimeout: 15_000,
      });
      const content = buildOrganizationOwnerInvitationEmail(input);

      try {
        await transport.sendMail({
          from: { name: smtp.fromName, address: smtp.fromAddress },
          to: input.recipientEmail,
          subject: content.subject,
          text: content.text,
          html: content.html,
        });
      } finally {
        transport.close();
      }

      this.logger.log(`Invitation ${invitationId} email was accepted by SMTP`);
      return "EMAIL_SENT";
    } catch (error) {
      const reason = error instanceof Error ? error.message : "Unknown SMTP error";
      this.logger.warn(
        `Invitation ${invitationId} email delivery failed: ${reason}`,
      );
      return "EMAIL_FAILED";
    }
  }

  private resolveSmtpSettings(
    stored: Awaited<ReturnType<SettingsService["getAll"]>>["email"],
  ) {
    const host = firstValue(stored.smtpHost, process.env.SMTP_HOST);
    const portValue = firstValue(stored.smtpPort, process.env.SMTP_PORT);
    const username = firstValue(
      stored.smtpUsername,
      process.env.SMTP_USERNAME,
    );
    const password = normalizeSmtpPassword(
      host,
      firstValue(stored.smtpPassword, process.env.SMTP_PASSWORD),
    );
    const fromAddress = firstValue(
      stored.mailFromAddress,
      process.env.MAIL_FROM_ADDRESS,
      username,
    );
    const fromName = firstValue(
      stored.mailFromName,
      process.env.MAIL_FROM_NAME,
      "NirmanSite Super Admin",
    );
    const encryption = firstValue(
      stored.smtpEncryption,
      process.env.SMTP_ENCRYPTION,
      "tls",
    ).toLowerCase();
    const port = Number(portValue);

    if (!host || !fromAddress || !Number.isInteger(port) || port <= 0) {
      return null;
    }

    return {
      host,
      port,
      username,
      password,
      fromAddress,
      fromName,
      secure: encryption === "ssl" || encryption === "smtps" || port === 465,
      requireTls: encryption === "tls" || encryption === "starttls",
    };
  }
}

function firstValue(
  ...values: Array<string | null | undefined>
): string {
  return values.find((value) => value?.trim())?.trim() ?? "";
}

function normalizeSmtpPassword(host: string, password: string) {
  // Google displays 16-character App Passwords in four groups. The spaces are
  // presentation-only and must not be sent as part of SMTP authentication.
  return host.toLowerCase() === "smtp.gmail.com"
    ? password.replace(/\s+/g, "")
    : password;
}
