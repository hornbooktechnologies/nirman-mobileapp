import { Injectable } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { EmailService } from "../email/email.service";
import { WebsiteEnquiriesRepository } from "./website-enquiries.repository";
import { validateContactFields } from "./contact-validation";

const clean = (value: unknown, limit: number) =>
  typeof value === "string"
    ? value
        .trim()
        // Strip unsafe control characters while retaining normal whitespace.
        // eslint-disable-next-line no-control-regex
        .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "")
        .slice(0, limit + 1)
    : "";

@Injectable()
export class WebsiteContactService {
  constructor(
    private readonly repository: WebsiteEnquiriesRepository,
    private readonly email: EmailService,
  ) {}

  async submit(raw: Record<string, unknown>) {
    if (raw.website) return { status: 200, body: { ok: true } };
    const enquiry = {
      name: clean(raw.name, 100),
      phone: clean(raw.phone, 25),
      email: clean(raw.email, 150).toLowerCase(),
      organizationType: clean(raw.organizationType, 16),
      message: clean(raw.message, 1000),
    };
    const fieldErrors = validateContactFields(enquiry);
    if (Object.keys(fieldErrors).length)
      return {
        status: 400,
        body: {
          ok: false,
          error: "Please check the form fields.",
          fieldErrors,
        },
      };
    const contact = {
      ...enquiry,
      organizationType: enquiry.organizationType as "BUILDER" | "CONTRACTOR",
    };
    try {
      await this.repository.create({ ...contact, submissionKey: randomUUID() });
    } catch {
      return {
        status: 503,
        body: {
          ok: false,
          error: "We could not save your enquiry. Please try again later.",
        },
      };
    }
    // Storage is durable before notifications; SMTP failure must not lose an enquiry.
    const delivery = await this.email.sendContactEmails(contact);
    return { status: 200, body: { ok: true, ...delivery } };
  }
}
