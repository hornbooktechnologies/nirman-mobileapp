import {
  Injectable,
  ServiceUnavailableException,
  StreamableFile,
} from "@nestjs/common";
import { join } from "node:path";
import pdfMake from "pdfmake";
import type { Content, TDocumentDefinitions } from "pdfmake/interfaces";
import type { Response } from "express";
import {
  assertReportLimit,
  groupReportColumns,
  PDF_EXPORT_ROW_LIMIT,
  type ExportReport,
} from "./report";

@Injectable()
export class PdfExportService {
  private active = 0;

  constructor() {
    const font = (name: string) => {
      const path = join(__dirname, "assets", `${name}-Regular.ttf`);
      return { normal: path, bold: path, italics: path, bolditalics: path };
    };
    pdfMake.addFonts({
      NotoSans: font("NotoSans"),
      NotoHindi: font("NotoSansDevanagari"),
      NotoGujarati: font("NotoSansGujarati"),
    });
    // Report values are plain text. Renderer resources can only use bundled fonts.
    pdfMake.setUrlAccessPolicy(() => false);
    const fontDirectory = join(__dirname, "assets");
    pdfMake.setLocalAccessPolicy(
      (path) =>
        path.startsWith(`${fontDirectory}/`) ||
        path.startsWith(`${fontDirectory}\\`),
    );
  }

  definition(report: ExportReport): TDocumentDefinitions {
    const text = (value: string) =>
      (
        value.match(
          /[\u0900-\u097f]+|[\u0a80-\u0aff]+|[^\u0900-\u097f\u0a80-\u0aff]+/gu,
        ) ?? [""]
      ).map((run) => ({
        text: run,
        font: /[\u0900-\u097f]/u.test(run)
          ? "NotoHindi"
          : /[\u0a80-\u0aff]/u.test(run)
            ? "NotoGujarati"
            : "NotoSans",
      }));
    const generated = new Intl.DateTimeFormat("en-IN", {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: "Asia/Kolkata",
    }).format(new Date());
    const content: Content[] = [
      {
        text: text(`${report.title} · ${report.projectName}`),
        fontSize: 20,
        margin: [0, 0, 0, 8],
      },
      { text: text(report.scope ?? "All records"), margin: [0, 0, 0, 6] },
      {
        text: `NirmanSite · Generated ${generated} IST`,
        color: "#475569",
        margin: [0, 0, 0, 16],
      },
    ];
    for (const table of report.tables) {
      const groups = groupReportColumns(table);
      groups.forEach((group, index) => {
        content.push({
          text: text(
            `${table.title ?? "Records"} · ${table.rows.length} records${groups.length > 1 ? ` · Columns ${index + 1} of ${groups.length}` : ""}`,
          ),
          fontSize: 12,
          margin: [0, 12, 0, 8],
        });
        content.push({
          table: {
            headerRows: 1,
            widths: group.headers.map((_, index) => (index === 0 ? 24 : "*")),
            body: [
              group.headers.map((value) => ({
                text: text(value),
                fillColor: "#1e293b",
                color: "#ffffff",
                margin: [4, 5, 4, 5] as [number, number, number, number],
              })),
              ...group.rows.map((row) =>
                row.map((value) => ({
                  text: text(value),
                  margin: [4, 4, 4, 4] as [number, number, number, number],
                })),
              ),
            ],
          },
          layout: "lightHorizontalLines",
          fontSize: 8,
        });
        if (!table.rows.length)
          content.push({
            text: "No records match this export.",
            margin: [0, 8, 0, 8],
          });
      });
    }
    return {
      pageSize: "A4",
      pageOrientation: "landscape",
      pageMargins: [28, 28, 28, 35],
      info: { title: report.title, author: "NirmanSite" },
      defaultStyle: { font: "NotoSans", fontSize: 10 },
      content,
      footer: (page, total) => ({
        text: `NirmanSite · Page ${page} of ${total}`,
        alignment: "right",
        margin: [28, 8, 28, 0],
        fontSize: 8,
      }),
    };
  }

  async render(report: ExportReport): Promise<Buffer> {
    assertReportLimit(
      report.tables.reduce((count, table) => count + table.rows.length, 0),
      PDF_EXPORT_ROW_LIMIT,
    );
    if (this.active >= 2)
      throw new ServiceUnavailableException({
        code: "PDF_EXPORT_BUSY",
        message: "Reports are being prepared. Please try again shortly.",
      });
    this.active++;
    try {
      return await pdfMake.createPdf(this.definition(report)).getBuffer();
    } finally {
      this.active--;
    }
  }

  async download(report: ExportReport, response: Response) {
    const buffer = await this.render(report);
    response.setHeader("Content-Type", "application/pdf");
    response.setHeader(
      "Content-Disposition",
      `attachment; filename="${report.pdfFilename.replace(/[^a-zA-Z0-9_.-]/g, "-")}"`,
    );
    response.setHeader("Content-Length", buffer.length);
    response.setHeader("Cache-Control", "private, no-store");
    response.setHeader("X-Content-Type-Options", "nosniff");
    return new StreamableFile(buffer);
  }
}
