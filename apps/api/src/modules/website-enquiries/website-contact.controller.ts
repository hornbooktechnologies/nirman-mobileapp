import { Body, Controller, Post, Req, Res } from "@nestjs/common";
import type { Request, Response } from "express";
import { Public } from "../auth/decorators/public.decorator";
import { WebsiteContactService } from "./website-contact.service";
import { contactWebsiteOrigin } from "../../common/public-website-origin";

@Controller("public/contact")
export class WebsiteContactController {
  // Per-process burst protection. Reverse-proxy addresses are not trusted from headers.
  private readonly attempts = new Map<
    string,
    { count: number; expires: number }
  >();
  constructor(private readonly service: WebsiteContactService) {}

  @Public()
  @Post()
  async submit(
    @Body() body: Record<string, unknown>,
    @Req() request: Request,
    @Res() response: Response,
  ) {
    const websiteOrigin = contactWebsiteOrigin();
    const origin = request.headers.origin;
    if (origin !== websiteOrigin)
      return response
        .status(403)
        .json({ ok: false, error: "Request origin is not allowed." });
    const form = request.is("application/x-www-form-urlencoded");
    const fail = (status: number, error: string) =>
      form
        ? response.redirect(303, `${websiteOrigin}/contact?send=error`)
        : response.status(status).json({ ok: false, error });
    if (!form && !request.is("application/json"))
      return fail(415, "Invalid request.");
    if (!body || typeof body !== "object" || Array.isArray(body))
      return fail(400, "Invalid request.");
    if (JSON.stringify(body).length > 6000)
      return fail(413, "Enquiry is too long.");
    const now = Date.now();
    for (const [key, value] of this.attempts)
      if (value.expires <= now) this.attempts.delete(key);
    // Include email because same-origin proxies can share a socket address.
    const address = body.email ?? body["Email address"];
    const key = `${request.ip || request.socket.remoteAddress || "unknown"}:${typeof address === "string" ? address.trim().toLowerCase().slice(0, 150) : ""}`;
    const attempt = this.attempts.get(key) ?? {
      count: 0,
      expires: now + 60_000,
    };
    if (
      attempt.count >= 20 ||
      (!this.attempts.has(key) && this.attempts.size >= 10_000)
    )
      return fail(429, "Too many requests. Please try again shortly.");
    attempt.count++;
    this.attempts.set(key, attempt);
    const input = form
      ? {
          name: body["Full name"],
          phone: body["Mobile number"],
          email: body["Email address"],
          organizationType: body["Organization type"],
          message: body["Help requested"],
          website: body.website,
        }
      : body;
    const result = await this.service.submit(input);
    if (form)
      return response.redirect(
        303,
        `${websiteOrigin}/contact?send=${result.body.ok ? "sent" : "error"}`,
      );
    return response.status(result.status).json(result.body);
  }
}
