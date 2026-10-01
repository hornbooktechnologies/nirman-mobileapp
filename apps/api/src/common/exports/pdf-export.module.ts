import { Global, Module } from "@nestjs/common";
import { PdfExportService } from "./pdf-export.service";

@Global()
@Module({ providers: [PdfExportService], exports: [PdfExportService] })
export class PdfExportModule {}
