"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "./button";

export function CsvExportButton({ load, filename, disabled = false }: { load: (signal: AbortSignal) => Promise<string>; filename: string; disabled?: boolean }) {
  const current = useRef<AbortController | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => () => { current.current?.abort(); }, []);
  async function run() {
    if (current.current || disabled) return;
    const controller = new AbortController(); current.current = controller; setBusy(true); setError("");
    try {
      const csv = await load(controller.signal);
      if (controller.signal.aborted) return;
      const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
      const anchor = document.createElement("a"); anchor.href = url; anchor.download = filename; anchor.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (reason) { if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : "CSV export failed. Try again."); }
    finally { if (!controller.signal.aborted) { current.current = null; setBusy(false); } }
  }
  return <span className="inline-flex flex-wrap items-center gap-2"><Button variant="outline" disabled={disabled || busy} onClick={() => void run()}>{busy ? "Preparing CSV…" : "Export CSV"}</Button>{error ? <span role="alert" className="text-sm text-danger">{error}</span> : null}</span>;
}
