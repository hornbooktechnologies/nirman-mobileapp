import { BROCHURE_PROJECT_QUOTA_BYTES } from "@nirman-app/shared";
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import type { Response } from "express";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { RequirePermissions } from "../auth/decorators/require-permissions.decorator";
import { PermissionsGuard } from "../auth/guards/permissions.guard";
import type { AuthenticatedUser } from "../auth/types/auth.types";
import { BrochuresService } from "./brochures.service";
import {
  BrochureSelectionDto,
  DeleteBrochureDto,
  EmailBrochureShareDto,
  UpdateBrochureDto,
  UploadBrochureDto,
} from "./dto/brochures.dto";

@Controller("organizations/:organizationId/projects/:projectId/brochures")
@UseGuards(PermissionsGuard)
export class BrochuresController {
  constructor(private readonly service: BrochuresService) {}
  @Get() @RequirePermissions("brochures:read") list(
    @Param("organizationId", ParseUUIDPipe) o: string,
    @Param("projectId", ParseUUIDPipe) p: string,
    @Query("includeArchived") archived: string | undefined,
    @CurrentUser() a: AuthenticatedUser,
  ) {
    return this.result(
      "Brochures retrieved",
      this.service.list(o, p, a, archived === "true"),
    );
  }
  @Post()
  @RequirePermissions("brochures:upload")
  @UseInterceptors(
    FileInterceptor("file", {
      limits: { fileSize: BROCHURE_PROJECT_QUOTA_BYTES, files: 1 },
    }),
  )
  upload(
    @Param("organizationId", ParseUUIDPipe) o: string,
    @Param("projectId", ParseUUIDPipe) p: string,
    @Body() d: UploadBrochureDto,
    @UploadedFile() f: Express.Multer.File | undefined,
    @CurrentUser() a: AuthenticatedUser,
  ) {
    return this.result("Brochure uploaded", this.service.upload(o, p, d, f, a));
  }
  @Get(":assetId/media") @RequirePermissions("brochures:read") async media(
    @Param("organizationId", ParseUUIDPipe) o: string,
    @Param("projectId", ParseUUIDPipe) p: string,
    @Param("assetId", ParseUUIDPipe) id: string,
    @CurrentUser() a: AuthenticatedUser,
    @Res() res: Response,
  ) {
    const media = await this.service.media(o, p, id, a);
    this.send(res, media);
  }
  @Patch(":assetId") @RequirePermissions("brochures:manage") update(
    @Param("organizationId", ParseUUIDPipe) o: string,
    @Param("projectId", ParseUUIDPipe) p: string,
    @Param("assetId", ParseUUIDPipe) id: string,
    @Body() d: UpdateBrochureDto,
    @CurrentUser() a: AuthenticatedUser,
  ) {
    return this.result("Brochure updated", this.service.update(o, p, id, d, a));
  }
  @Delete(":assetId") @RequirePermissions("brochures:manage") remove(
    @Param("organizationId", ParseUUIDPipe) o: string,
    @Param("projectId", ParseUUIDPipe) p: string,
    @Param("assetId", ParseUUIDPipe) id: string,
    @Body() _d: DeleteBrochureDto,
    @CurrentUser() a: AuthenticatedUser,
  ) {
    return this.result("Brochure deleted", this.service.delete(o, p, id, a));
  }
  @Get(["shares", "shares/history"])
  @RequirePermissions("brochures:read")
  shares(
    @Param("organizationId", ParseUUIDPipe) o: string,
    @Param("projectId", ParseUUIDPipe) p: string,
    @CurrentUser() a: AuthenticatedUser,
  ) {
    return this.result(
      "Brochure share history retrieved",
      this.service.shares(o, p, a),
    );
  }
  @Post("shares/email") @RequirePermissions("brochures:share") email(
    @Param("organizationId", ParseUUIDPipe) o: string,
    @Param("projectId", ParseUUIDPipe) p: string,
    @Body() d: EmailBrochureShareDto,
    @CurrentUser() a: AuthenticatedUser,
  ) {
    return this.result(
      "Brochure email processed",
      this.service.shareEmail(o, p, d, a),
    );
  }
  @Post("shares/other") @RequirePermissions("brochures:share") other(
    @Param("organizationId", ParseUUIDPipe) o: string,
    @Param("projectId", ParseUUIDPipe) p: string,
    @Body() d: BrochureSelectionDto,
    @CurrentUser() a: AuthenticatedUser,
  ) {
    return this.result(
      "Brochure share link created",
      this.service.shareOther(o, p, d, a),
    );
  }
  @Post("shares/:shareId/retry-email")
  @RequirePermissions("brochures:share")
  retry(
    @Param("organizationId", ParseUUIDPipe) o: string,
    @Param("projectId", ParseUUIDPipe) p: string,
    @Param("shareId", ParseUUIDPipe) id: string,
    @CurrentUser() a: AuthenticatedUser,
  ) {
    return this.result(
      "Brochure email retried",
      this.service.retryEmail(o, p, id, a),
    );
  }
  @Post("shares/:shareId/revoke")
  @RequirePermissions("brochures:manage")
  async revoke(
    @Param("organizationId", ParseUUIDPipe) o: string,
    @Param("projectId", ParseUUIDPipe) p: string,
    @Param("shareId", ParseUUIDPipe) id: string,
    @CurrentUser() a: AuthenticatedUser,
  ) {
    await this.service.revoke(o, p, id, a);
    return { success: true, message: "Brochure share revoked", data: null };
  }
  private async result(message: string, promise: Promise<unknown>) {
    return { success: true, message, data: await promise };
  }
  private send(
    res: Response,
    media: { body: Buffer; contentType: string; filename: string },
  ) {
    res.setHeader("Content-Type", media.contentType);
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Cache-Control", "private, max-age=120");
    res.setHeader(
      "Content-Disposition",
      `inline; filename*=UTF-8''${encodeURIComponent(media.filename)}`,
    );
    res.send(media.body);
  }
}
