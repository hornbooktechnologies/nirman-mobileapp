import { PdfExportService } from "./pdf-export.service";
import {
  groupReportColumns,
  reportCsv,
  reportTable,
  type ExportReport,
} from "./report";
import type { Response } from "express";

describe("On-demand PDF reports", () => {
  const renderer = new PdfExportService();
  const report: ExportReport = {
    title: "Wages",
    projectName: "Green Heights",
    scope: "From: 2026-09-01 · To: 2026-09-30",
    csvFilename: "wages.csv",
    pdfFilename: "wages-Green-Heights-2026-09-01-2026-09-30.pdf",
    tables: [
      reportTable(
        [
          ["Worker Code", "Worker Name", "Amount", "Notes"],
          ...Array.from({ length: 250 }, (_, i) => [
            String(i).padStart(3, "0"),
            "राजेश પટેલ",
            "001.20",
            'Site "A"\nsecond line',
          ]),
        ],
        "Wage items",
      ),
      reportTable([["Worker Code", "Amount"]], "Payment History"),
    ],
  };

  it("renders real multipage PDF bytes entirely in memory with both wage tables and Indic fonts", async () => {
    const buffer = await renderer.render(report);
    expect(buffer.subarray(0, 5).toString()).toBe("%PDF-");
    expect(
      (buffer.toString("latin1").match(/\/Type \/Page\b/g) ?? []).length,
    ).toBeGreaterThan(1);
    const definition = JSON.stringify(renderer.definition(report));
    expect(definition).toContain("Green Heights");
    expect(definition).toContain("2026-09-01");
    expect(definition).toContain("Payment History");
    expect(definition).toContain("NotoHindi");
    expect(definition).toContain("NotoGujarati");
  });

  it("returns binary attachment with no-store headers, never a JSON wrapper", async () => {
    const setHeader = jest.fn();
    const response = { setHeader } as unknown as Response;
    const file = await renderer.download(
      { ...report, tables: [reportTable([["Code"]])] },
      response,
    );
    const chunks: Buffer[] = [];
    for await (const chunk of file.getStream())
      chunks.push(Buffer.from(chunk as Uint8Array));
    expect(Buffer.concat(chunks).subarray(0, 5).toString()).toBe("%PDF-");
    expect(setHeader).toHaveBeenCalledWith("Content-Type", "application/pdf");
    expect(setHeader).toHaveBeenCalledWith(
      "Cache-Control",
      "private, no-store",
    );
    expect(setHeader).toHaveBeenCalledWith(
      "Content-Disposition",
      `attachment; filename="${report.pdfFilename}"`,
    );
  });

  it("keeps CSV amounts, identifiers, quotes and payment history compatible", () => {
    const csv = reportCsv(report).csv;
    expect(csv).toContain(
      '"000","राजेश પટેલ","001.20","Site ""A""\nsecond line"',
    );
    expect(csv).toContain(
      '\r\n\r\n"Payment History"\r\n"Worker Code","Amount"\r\n',
    );
  });

  it("retains every wide-table field with row numbers and worker identifiers", () => {
    const headers = Array.from({ length: 18 }, (_, i) => `Column ${i}`);
    const groups = groupReportColumns({ headers, rows: [headers] });
    expect(groups.flatMap((group) => group.headers.slice(2))).toEqual(
      headers.slice(1),
    );
    for (const group of groups)
      expect(group.rows[0].slice(0, 2)).toEqual(["1", "Column 0"]);
  });

  it("rejects oversized PDFs instead of truncating data", async () => {
    await expect(
      renderer.render({
        ...report,
        tables: [
          {
            headers: ["Code"],
            rows: Array.from({ length: 5001 }, () => ["001"]),
          },
        ],
      }),
    ).rejects.toMatchObject({ response: { code: "PDF_EXPORT_TOO_LARGE" } });
  });

  it("bounds concurrent rendering and releases capacity after completion", async () => {
    const small = { ...report, tables: [reportTable([["Code"]])] };
    const pending = [renderer.render(small), renderer.render(small)];
    await expect(renderer.render(small)).rejects.toMatchObject({
      response: { code: "PDF_EXPORT_BUSY" },
    });
    await Promise.all(pending);
    await expect(renderer.render(small)).resolves.toBeInstanceOf(Buffer);
  });
});
