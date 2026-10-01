import { UnprocessableEntityException } from "@nestjs/common";

export type ReportTable = {
  title?: string;
  headers: string[];
  rows: string[][];
};
export type ExportReport = {
  title: string;
  projectName: string;
  scope?: string;
  csvFilename: string;
  pdfFilename: string;
  tables: ReportTable[];
};

export function reportText(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) return value.toISOString();
  if (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean" ||
    typeof value === "bigint"
  )
    return String(value);
  return JSON.stringify(value) ?? "";
}

export function reportTable(matrix: unknown[][], title?: string): ReportTable {
  return {
    title,
    headers: matrix[0].map(reportText),
    rows: matrix.slice(1).map((row) => row.map(reportText)),
  };
}

export function reportCsv(report: ExportReport) {
  const cell = (value: string) => `"${value.replace(/"/g, '""')}"`;
  const blocks = report.tables.map((table, index) =>
    [
      ...(index > 0 && table.title ? [cell(table.title)] : []),
      [table.headers, ...table.rows]
        .map((row) => row.map(cell).join(","))
        .join("\r\n"),
    ].join("\r\n"),
  );
  return {
    filename: report.csvFilename,
    csv: `${blocks.join("\r\n\r\n")}\r\n`,
  };
}

export const PDF_EXPORT_ROW_LIMIT = 5000;

export function assertReportLimit(count: number, limit?: number) {
  if (limit !== undefined && count > limit)
    throw new UnprocessableEntityException({
      code: "PDF_EXPORT_TOO_LARGE",
      message:
        "This PDF is too large. Choose a shorter period or narrower filters and try again.",
    });
}

/** Human-readable filters only; internal IDs and pagination are not report headings. */
export function reportScope(query: object) {
  const labels: Record<string, string> = {
    startDate: "From",
    endDate: "To",
    dateFrom: "From",
    dateTo: "To",
    expenseFrom: "From",
    expenseTo: "To",
    requiredFrom: "Required from",
    requiredTo: "Required to",
    search: "Search",
    status: "Status",
    category: "Category",
    stage: "Stage",
    paymentMethod: "Payment method",
  };
  return (
    Object.entries(query)
      .filter(
        ([key, value]) => labels[key] && value !== undefined && value !== "",
      )
      .map(([key, value]) => `${labels[key]}: ${reportText(value)}`)
      .join(" · ") || "All records"
  );
}

export function readablePdfFilename(
  title: string,
  projectName: string,
  period?: string,
) {
  const name = [title, projectName, period]
    .filter(Boolean)
    .join("-")
    .replace(/[^a-zA-Z0-9_-]/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 150);
  return `${name || "report"}.pdf`;
}

export function groupReportColumns(
  table: ReportTable,
  limit = 7,
): ReportTable[] {
  const headers = ["No.", ...table.headers];
  const rows = table.rows.map((row, index) => [String(index + 1), ...row]);
  if (headers.length <= limit) return [{ ...table, headers, rows }];
  const groups: ReportTable[] = [];
  for (let start = 2; start < headers.length; start += limit - 2) {
    const indices = [
      0,
      1,
      ...Array.from(
        { length: Math.min(limit - 2, headers.length - start) },
        (_, index) => start + index,
      ),
    ];
    groups.push({
      title: table.title,
      headers: indices.map((index) => headers[index]),
      rows: rows.map((row) => indices.map((index) => row[index])),
    });
  }
  return groups;
}
