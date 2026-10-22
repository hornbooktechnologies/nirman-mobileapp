import { Controller, Get, Param, Res } from "@nestjs/common";
import type { Response } from "express";
import { Public } from "../auth/decorators/public.decorator";
import { BrochuresService } from "./brochures.service";

@Controller("public/brochure-shares")
@Public()
export class PublicBrochuresController {
  constructor(private readonly service: BrochuresService) {}
  @Get(":token") async detail(@Param("token") token: string) {
    return {
      success: true,
      message: "Shared brochures retrieved",
      data: await this.service.publicShare(token),
    };
  }
  @Get(":token/assets/:assetId/media") async media(
    @Param("token") token: string,
    @Param("assetId") assetId: string,
    @Res() res: Response,
  ) {
    const media = await this.service.publicMedia(token, assetId);
    res.setHeader("Content-Type", media.contentType);
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Cache-Control", "private, max-age=60");
    res.setHeader(
      "Content-Disposition",
      `inline; filename*=UTF-8''${encodeURIComponent(media.filename)}`,
    );
    res.send(media.body);
  }
}
