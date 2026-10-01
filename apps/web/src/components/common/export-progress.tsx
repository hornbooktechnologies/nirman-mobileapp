'use client';

import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { PDF_EXPORT_READY_EVENT, type PdfDownload } from '@/lib/exports/pdf';

export function ExportProgress({ active }: { active: boolean }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const retainedUrl = useRef<string | null>(null);
  const [ready, setReady] = useState<{ url: string; filename: string } | null>(null);
  const [seconds, setSeconds] = useState(0);
  useEffect(() => {
    const onReady = (event: Event) => {
      const file = (event as CustomEvent<PdfDownload>).detail;
      if (retainedUrl.current) URL.revokeObjectURL(retainedUrl.current);
      const url = URL.createObjectURL(file.blob);
      retainedUrl.current = url;
      setReady({ url, filename: file.filename });
    };
    window.addEventListener(PDF_EXPORT_READY_EVENT, onReady);
    return () => {
      window.removeEventListener(PDF_EXPORT_READY_EVENT, onReady);
      if (retainedUrl.current) URL.revokeObjectURL(retainedUrl.current);
    };
  }, []);
  useEffect(() => {
    const element = dialog.current;
    if ((active || ready) && !element?.open) element?.showModal();
    if (!active && !ready) element?.close();
  }, [active, ready]);
  useEffect(() => {
    if (!active) return;
    const started = Date.now();
    const timer = window.setInterval(() => setSeconds(Math.floor((Date.now() - started) / 1000)), 1000);
    return () => window.clearInterval(timer);
  }, [active]);
  const dismiss = () => {
    dialog.current?.close();
    if (retainedUrl.current) {
      URL.revokeObjectURL(retainedUrl.current);
      retainedUrl.current = null;
    }
    setReady(null);
  };
  return <dialog ref={dialog} data-pdf-export-progress aria-labelledby="export-progress-title" onCancel={dismiss} className="m-auto w-[min(90vw,24rem)] rounded-2xl border border-hairline bg-surface p-6 text-ink shadow-floating backdrop:bg-black/40">
    <h2 id="export-progress-title" className="text-lg font-semibold">{ready ? 'Your PDF is ready' : 'Preparing your PDF'}</h2>
    <p className="mt-2 text-sm text-sub">{ready ? 'The automatic download has been requested. If it hasn’t started, use Download PDF below.' : 'The server is preparing your report. Large exports may take longer.'}</p>
    {ready ? <p className="mt-4 break-all text-sm text-sub">{ready.filename}</p> : <>
      <progress aria-label="Preparing PDF" className="mt-5 h-2 w-full accent-lime" />
      <p role="status" className="mt-3 text-sm text-sub">{seconds}s elapsed · Download starts automatically</p>
    </>}
    <div className="mt-4 flex flex-wrap gap-2">
      {ready ? <>
        <a href={ready.url} download={ready.filename} className="inline-flex min-h-11 items-center justify-center rounded-inner border border-transparent bg-lime px-4 py-2 text-sm font-semibold text-lime-ink hover:bg-lime-sub focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime/40">Download PDF</a>
        <Button variant="outline" onClick={dismiss}>Done</Button>
      </> : <Button variant="outline" onClick={() => dialog.current?.close()}>Continue in background</Button>}
    </div>
  </dialog>;
}
