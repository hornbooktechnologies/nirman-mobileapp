"use client";
/* eslint-disable @next/next/no-img-element -- Local file previews use revocable Blob URLs. */
import { useEffect, useRef, useState } from "react";
import { GALLERY_CATEGORIES, PROJECT_PROGRESS_STAGES, type GalleryCategory, type ProjectProgressStage } from "@nirman-app/shared";
import { Button, Card, Dialog, Input, Select } from "@/components/ui";
import { canUpload, fileError, label } from "../gallery-rules";
import { readQueue, savePhoto, removePhoto, type QueuedPhoto } from "../queue";
import { galleryService } from "../services/gallery.service";
import type { GalleryContext } from "./gallery-workspace";

export function UploadPanel({ context: c, uploaded }: { context: GalleryContext; uploaded: () => void }) {
  const [queue, setQueue] = useState<QueuedPhoto[]>([]);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [category, setCategory] = useState<GalleryCategory>("PROGRESS");
  const [stage, setStage] = useState("");
  const [caption, setCaption] = useState("");
  const [saving, setSaving] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const controller = useRef<AbortController | null>(null);
  const mounted = useRef(true);
  const savingRef = useRef(false);
  const permitted = canUpload(c.permissions, c.active);
  useEffect(() => {
    mounted.current = true;
    const cancel = () => { mounted.current = false; controller.current?.abort(); };
    window.addEventListener("gallery-session-cleared", cancel);
    void readQueue({ org: c.org, project: c.project, user: c.user }).then(rows => { if (mounted.current) setQueue(rows); }).catch(e => { if (mounted.current) setError(e.message); });
    return () => { cancel(); window.removeEventListener("gallery-session-cleared", cancel); };
  }, [c.org, c.project, c.user]);
  useEffect(() => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    // Object URLs belong to this file selection and are never persisted.
    queueMicrotask(() => setPreview(url));
    return () => URL.revokeObjectURL(url);
  }, [file]);
  useEffect(() => {
    if (!open || (!file && !caption)) return;
    const unload = (event: BeforeUnloadEvent) => { event.preventDefault(); };
    const navigate = (event: MouseEvent) => {
      const link = (event.target as Element).closest?.("a[href]");
      if (link && !window.confirm("Discard this unsaved photo selection?")) { event.preventDefault(); event.stopPropagation(); }
    };
    window.addEventListener("beforeunload", unload);
    document.addEventListener("click", navigate, true);
    return () => { window.removeEventListener("beforeunload", unload); document.removeEventListener("click", navigate, true); };
  }, [open, file, caption]);
  async function refresh() { const rows = await readQueue(c); if (mounted.current) setQueue(rows); }
  async function send(row: QueuedPhoto) {
    if (!permitted || controller.current || !mounted.current) return;
    const request = new AbortController(); controller.current = request; setBusy(row.entryId); setError("");
    const next: QueuedPhoto = { ...row, state: "UPLOADING", attempts: row.attempts + 1, lastError: undefined };
    try {
      await savePhoto(next);
      if (!mounted.current) return;
      await refresh();
      const entry = await galleryService.upload(next, request.signal);
      if (!mounted.current) return;
      await removePhoto(row.entryId); await refresh();
      setMessage(`Photo ${entry.status === "APPROVED" ? "published" : label(entry.status).toLowerCase()}.`); uploaded();
    } catch (e) {
      if (!mounted.current) return;
      const message = e instanceof Error ? e.message : "Upload failed. Retry with the same photo.";
      try { await savePhoto({ ...next, state: "FAILED", lastError: message }); await refresh(); } catch (storage) { setError(storage instanceof Error ? storage.message : "Queue unavailable"); }
      setError(message);
    } finally { controller.current = null; if (mounted.current) setBusy(null); }
  }
  async function enqueue(event: React.FormEvent) {
    event.preventDefault(); if (!file || savingRef.current || !permitted) return;
    const invalid = fileError(file); if (invalid) { setError(invalid); return; }
    savingRef.current = true; setSaving(true); setError("");
    const entryId = crypto.randomUUID();
    const row: QueuedPhoto = { user: c.user, org: c.org, project: c.project, entryId, idempotencyKey: `gallery-${entryId}`, file, fileName: file.name, category, stage: stage as ProjectProgressStage || undefined, caption: caption.trim() || undefined, capturedAt: new Date().toISOString(), state: "QUEUED", attempts: 0 };
    try {
      await savePhoto(row); if (!mounted.current) return;
      // Persistence is the commit point: never leave a saved selection available
      // for another enqueue if refreshing the visible queue subsequently fails.
      setOpen(false); setFile(null); setCaption(""); setMessage("Photo saved to this browser's upload queue.");
      await refresh();
      if (navigator.onLine) void send(row);
    } catch (e) { setError(e instanceof Error ? e.message : "Could not save photo. Retry."); }
    finally { savingRef.current = false; if (mounted.current) setSaving(false); }
  }
  const close = () => { if (!saving && ((!file && !caption) || window.confirm("Discard this unsaved photo selection?"))) { setOpen(false); setFile(null); } };
  return <section className="space-y-3" aria-label="Photo upload">
    {permitted && <Button variant="primary" onClick={() => { setError(""); setOpen(true); }}>Add photo</Button>}
    {message && <p role="status">{message}</p>}
    {error && !open && <div><p role="alert">{error}</p><Button variant="outline" onClick={() => { setError(""); void refresh().catch(e => setError(e.message)); }}>Reload queue</Button></div>}
    {queue.length > 0 && <Card><h2 className="text-lg font-semibold">Upload queue · {queue.length}</h2><p className="text-sm text-sub">Stored on this browser until uploaded or signed out. Queued photos are not yet published.</p><ul className="mt-3 space-y-3">{queue.map(row => <li key={row.entryId} className="flex flex-wrap items-center justify-between gap-3 border-t border-hairline pt-3"><div className="min-w-0"><p className="break-all font-semibold">{row.fileName}</p><p className="text-sm">{busy === row.entryId ? "Uploading…" : label(row.state)} · {row.attempts} attempts</p>{row.lastError && <p className="text-sm" role="alert">{row.lastError}</p>}</div><Button variant="outline" disabled={!permitted || Boolean(busy)} onClick={() => void send(row)}>{busy === row.entryId ? "Uploading…" : "Retry upload"}</Button></li>)}</ul></Card>}
    <Dialog open={open} title="Add site photo" description="JPEG, PNG or WebP, up to 10 MiB. Photos publish directly after upload." onOpenChange={close}>
      <form onSubmit={enqueue} className="space-y-4 text-base">
        <label className="block">Photo *<Input required={!file} type="file" accept="image/jpeg,image/png,image/webp" onChange={e => { const selected = e.target.files?.[0]; if (selected) { const invalid = fileError(selected); setError(invalid); if (!invalid) setFile(selected); else { setFile(null); e.target.value = ""; } } }} /></label>
        <label className="block">Take a photo<Input type="file" capture="environment" accept="image/jpeg,image/png,image/webp" onChange={e => { const selected = e.target.files?.[0]; if (selected) { const invalid = fileError(selected); setError(invalid); if (!invalid) setFile(selected); } }} /></label>
        {file && preview && <img src={preview} alt="Selected photo preview" className="max-h-64 w-full rounded-card object-contain" />}
        <label className="block">Category *<Select value={category} onChange={e => setCategory(e.target.value as GalleryCategory)}>{GALLERY_CATEGORIES.map(v => <option key={v} value={v}>{label(v)}</option>)}</Select></label>
        <label className="block">Stage<Select value={stage} onChange={e => setStage(e.target.value)}><option value="">No stage</option>{PROJECT_PROGRESS_STAGES.map(v => <option key={v} value={v}>{label(v)}</option>)}</Select></label>
        <label className="block">Caption<textarea className="w-full rounded-card border border-hairline bg-surface p-3" maxLength={1000} value={caption} onChange={e => setCaption(e.target.value)} /></label>
        {error && <p role="alert">{error}</p>}<Button variant="primary" type="submit" disabled={!file || saving || Boolean(busy)}>{saving ? "Saving photo…" : "Save and upload"}</Button>
      </form>
    </Dialog>
  </section>;
}
