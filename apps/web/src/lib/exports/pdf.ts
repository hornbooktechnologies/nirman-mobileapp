import axios from "axios";
import { apiClient } from "@/lib/api/api-client";

export type PdfDownload = { blob: Blob; filename: string };
export const PDF_EXPORT_READY_EVENT = "nirman:pdf-export-ready";

export async function requestPdf(path: string, params?: object, signal?: AbortSignal): Promise<PdfDownload> {
  try {
    const response = await apiClient.get<Blob>(path, { params, signal, responseType: "blob", headers: { Accept: "application/pdf" }, timeout: 120000 });
    if (!String(response.headers["content-type"] ?? "").startsWith("application/pdf") || (await response.data.slice(0, 5).text()) !== "%PDF-") throw new Error("The server did not return a valid PDF. Please retry.");
    const name = /filename="([^"]+)"/i.exec(String(response.headers["content-disposition"] ?? ""))?.[1] ?? "report.pdf";
    return { blob: response.data, filename: name.replace(/[^a-zA-Z0-9_.-]/g, "-") };
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.data instanceof Blob) {
      const body = await error.response.data.text().then(value => JSON.parse(value) as { error?: { message?: string }; message?: string }).catch(() => null);
      throw new Error(body?.error?.message ?? body?.message ?? "PDF export failed. Please retry.");
    }
    throw error;
  }
}

/** Save the exact API response; the browser does not render or modify PDFs. */
export function downloadPdf(file: PdfDownload) {
  // Preserve a direct download action if the browser blocks the automatic one.
  window.dispatchEvent(new CustomEvent<PdfDownload>(PDF_EXPORT_READY_EVENT, { detail: file }));
  const url = URL.createObjectURL(file.blob);
  const link = document.createElement("a");
  link.href = url; link.download = file.filename;
  link.hidden = true;
  // Keep the automatic link in the same modal as the visible download action.
  const container = document.querySelector<HTMLDialogElement>("dialog[data-pdf-export-progress]:modal") ?? document.body;
  container.appendChild(link);
  link.click(); link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
