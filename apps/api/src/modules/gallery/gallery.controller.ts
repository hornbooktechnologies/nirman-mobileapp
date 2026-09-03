import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import type { Response } from "express";
import { GALLERY_MAX_FILE_BYTES } from "@nirman-app/shared";
import { CurrentUser } from "../auth/decorators/current-user.decorator";
import { RequirePermissions } from "../auth/decorators/require-permissions.decorator";
import { PermissionsGuard } from "../auth/guards/permissions.guard";
import type { AuthenticatedUser } from "../auth/types/auth.types";
import {
  QueryGalleryDto,
  RejectGalleryEntryDto,
  ReviewGalleryEntryDto,
  UploadGalleryEntryDto,
} from "./dto/gallery.dto";
import { GalleryService } from "./gallery.service";

@Controller("organizations/:organizationId/projects/:projectId/gallery")
@UseGuards(PermissionsGuard)
export class GalleryController {
  constructor(private readonly service: GalleryService) {}
  @Get("summary") @RequirePermissions("gallery:read") summary(
    @Param("organizationId", new ParseUUIDPipe()) o: string,
    @Param("projectId", new ParseUUIDPipe()) p: string,
    @CurrentUser() a: AuthenticatedUser,
  ) {
    return this.result(
      "Gallery summary retrieved",
      this.service.summary(o, p, a),
    );
  }
  @Get("entries") @RequirePermissions("gallery:read") entries(
    @Param("organizationId", new ParseUUIDPipe()) o: string,
    @Param("projectId", new ParseUUIDPipe()) p: string,
    @Query() q: QueryGalleryDto,
    @CurrentUser() a: AuthenticatedUser,
  ) {
    return this.result(
      "Gallery entries retrieved",
      this.service.list(o, p, q, a),
    );
  }
  @Post("entries")
  @RequirePermissions("gallery:upload")
  @UseInterceptors(
    FileInterceptor("file", { limits: { fileSize: GALLERY_MAX_FILE_BYTES } }),
  )
  upload(
    @Param("organizationId", new ParseUUIDPipe()) o: string,
    @Param("projectId", new ParseUUIDPipe()) p: string,
    @Body() d: UploadGalleryEntryDto,
    @UploadedFile() f: Express.Multer.File | undefined,
    @CurrentUser() a: AuthenticatedUser,
  ) {
    return this.result(
      "Gallery photo uploaded",
      this.service.upload(o, p, d, f, a),
    );
  }
  @Get("entries/:entryId/media")
  @RequirePermissions("gallery:read")
  async media(
    @Param("organizationId", new ParseUUIDPipe()) o: string,
    @Param("projectId", new ParseUUIDPipe()) p: string,
    @Param("entryId", new ParseUUIDPipe()) id: string,
    @CurrentUser() a: AuthenticatedUser,
    @Res() response: Response,
  ) {
    const media = await this.service.media(o, p, id, a);
    response.setHeader("Content-Type", media.contentType);
    response.setHeader("Cache-Control", "private, max-age=120");
    response.send(media.body);
  }
  @Post("entries/:entryId/approve")
  @RequirePermissions("gallery:approve")
  approve(
    @Param("organizationId", new ParseUUIDPipe()) o: string,
    @Param("projectId", new ParseUUIDPipe()) p: string,
    @Param("entryId", new ParseUUIDPipe()) id: string,
    @Body() d: ReviewGalleryEntryDto,
    @CurrentUser() a: AuthenticatedUser,
  ) {
    return this.result(
      "Gallery photo approved",
      this.service.approve(o, p, id, d, a),
    );
  }
  @Post("entries/:entryId/reject") @RequirePermissions("gallery:reject") reject(
    @Param("organizationId", new ParseUUIDPipe()) o: string,
    @Param("projectId", new ParseUUIDPipe()) p: string,
    @Param("entryId", new ParseUUIDPipe()) id: string,
    @Body() d: RejectGalleryEntryDto,
    @CurrentUser() a: AuthenticatedUser,
  ) {
    return this.result(
      "Gallery photo rejected",
      this.service.reject(o, p, id, d, a),
    );
  }
  private async result(message: string, promise: Promise<unknown>) {
    return { success: true, message, data: await promise };
  }
}
