"use client";
import { useEffect, useRef, useState } from "react";
import type { GalleryEntry } from "@nirman-app/shared";
import { Button, Dialog, StatusBadge } from "@/components/ui";
import { ApiError } from "@/lib/api/api-client";
import { canReview, label } from "../gallery-rules";
import { galleryService } from "../services/gallery.service";
import type { GalleryContext } from "./gallery-workspace";
import { PrivateImage } from "./private-image";
export const dateTime = (value: string) => new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata" }).format(new Date(value));
export function GalleryDetail({ entry, context: c, close, changed }: { entry: GalleryEntry; context: GalleryContext; close: () => void; changed: (message?: string) => void }) {
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [stale, setStale] = useState(false);
  const request = useRef<AbortController | null>(null);
  useEffect(() => () => request.current?.abort(), []);
  async function review(action: "approve" | "reject") {
    if (request.current || stale || !canReview(c.permissions, c.user, entry, action)) return;
    const controller = new AbortController(); request.current = controller; setBusy(true); setError("");
    try { await galleryService.review(c.org, c.project, entry, action, reason, controller.signal); if (!controller.signal.aborted) { changed(action === "approve" ? "Photo approved." : "Photo rejected."); close(); } }
    catch (e) { if (!controller.signal.aborted) { setError(e instanceof Error ? e.message : "Review failed."); if (e instanceof ApiError && (e.statusCode === 409 || e.code === "GALLERY_STATUS_TRANSITION_INVALID")) setStale(true); } }
    finally { if (!controller.signal.aborted) { request.current = null; setBusy(false); } }
  }
  return <Dialog open title="Photo details" className="max-w-3xl" onOpenChange={() => { if (!busy) close(); }}>
    <div className="space-y-4 text-base"><PrivateImage org={c.org} project={c.project} id={entry.id} alt={entry.caption || `${label(entry.category)} photo`} full />
      <StatusBadge tone={entry.status === "APPROVED" ? "success" : entry.status === "PENDING" ? "warning" : "neutral"}>{label(entry.status)}</StatusBadge>
      <dl className="grid gap-4 sm:grid-cols-2">{[["Category", label(entry.category)], ["Stage", entry.stage ? label(entry.stage) : "No stage"], ["Captured", `${dateTime(entry.capturedAt)} IST`], ["Uploaded by", entry.uploadedBy], ["Uploaded", `${dateTime(entry.createdAt)} IST`], ["File", `${entry.mimeType} · ${(entry.byteSize / 1024 / 1024).toFixed(2)} MiB`], ["Dimensions", entry.width && entry.height ? `${entry.width} × ${entry.height}` : "Not recorded"], ["Version", String(entry.version)], ["Reviewed by", entry.reviewedBy || "Not reviewed"], ["Reviewed", entry.reviewedAt ? dateTime(entry.reviewedAt) : "Not reviewed"]].map(([name, value]) => <div key={name}><dt className="text-sm text-sub">{name}</dt><dd className="break-words">{value}</dd></div>)}</dl>
      <p className="whitespace-pre-wrap break-words">{entry.caption || "No caption"}</p>{entry.rejectionReason && <p>Rejection reason: {entry.rejectionReason}</p>}
      {error && <p role="alert">{error}</p>}
      {stale ? <div><p>This photo changed. Reload the gallery and open it again before reviewing.</p><Button onClick={() => { changed(); close(); }}>Reload gallery</Button></div> : <div className="space-y-3">
        {canReview(c.permissions, c.user, entry, "approve") && <Button disabled={busy} onClick={() => void review("approve")}>{busy ? "Submitting…" : "Approve photo"}</Button>}
        {canReview(c.permissions, c.user, entry, "reject") && <form onSubmit={e => { e.preventDefault(); void review("reject"); }} className="space-y-2"><label>Rejection reason *<textarea required minLength={8} maxLength={500} value={reason} onChange={e => setReason(e.target.value)} className="block w-full rounded-card border border-hairline bg-surface p-3" /></label><p className="text-sm text-sub">8–500 characters.</p><Button variant="outline" type="submit" disabled={busy || reason.trim().length < 8}>{busy ? "Submitting…" : "Reject photo"}</Button></form>}
      </div>}
    </div>
  </Dialog>;
}
