"use client";
import { Suspense, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { GALLERY_CATEGORIES, GALLERY_STATUSES, PROJECT_PROGRESS_STAGES, type GalleryEntry, type GalleryCategory, type GalleryStatus, type ProjectProgressStage } from "@nirman-app/shared";
import { Button, Card, Input, Select, LoadingState } from "@/components/ui";
import { galleryKey, label } from "../gallery-rules";
import { useGallery, useGallerySummary } from "../hooks/use-gallery";
import { GalleryWorkspace, type GalleryContext } from "./gallery-workspace";
import { PrivateImage } from "./private-image";
import { GalleryDetail } from "./gallery-detail";
import { UploadPanel } from "./upload-panel";

function ProjectGallery({ context: c }: { context: GalleryContext }) {
  const params = useSearchParams(); const router = useRouter(); const pathname = usePathname();
  const rawPage = Number(params.get("page") || 1); const page = Number.isSafeInteger(rawPage) && rawPage > 0 ? rawPage : 1;
  const category = GALLERY_CATEGORIES.find(v => v === params.get("category"));
  const stage = PROJECT_PROGRESS_STAGES.find(v => v === params.get("stage"));
  const status = GALLERY_STATUSES.find(v => v === params.get("status"));
  const dateFrom = params.get("dateFrom") || ""; const dateTo = params.get("dateTo") || "";
  const validDate = (v: string) => !v || /^\d{4}-\d{2}-\d{2}$/.test(v) && Number.isFinite(Date.parse(v)) && new Date(v).toISOString().slice(0,10) === v;
  const invalid = !validDate(dateFrom) || !validDate(dateTo) || Boolean(dateFrom && dateTo && dateFrom > dateTo);
  const list = useGallery(c.org, c.project, { page, pageSize: 24, category: category as GalleryCategory, stage: stage as ProjectProgressStage, status: status as GalleryStatus, dateFrom: dateFrom || undefined, dateTo: dateTo || undefined }, !invalid);
  const summary = useGallerySummary(c.org, c.project);
  const cache = useQueryClient(); const [selected, setSelected] = useState<GalleryEntry | null>(null);
  const [notice, setNotice] = useState("");
  const refresh = () => { void cache.invalidateQueries({ queryKey: galleryKey(c.org, c.project) }); };
  function filter(key: string, value: string) { const next = new URLSearchParams(params.toString()); if (value) next.set(key, value); else next.delete(key); if (key !== "page") next.delete("page"); router.replace(`${pathname}?${next}`, { scroll: false }); }
  const groups = new Map<string, GalleryEntry[]>();
  for (const entry of list.data?.items ?? []) { const day = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(entry.capturedAt)); groups.set(day, [...(groups.get(day) ?? []), entry]); }
  return <div className="space-y-5">
    <header className="flex flex-wrap items-center justify-between gap-3"><div><h1 className="text-2xl font-semibold">Gallery</h1><p className="text-sub">Your project diary, one photo at a time.</p></div><Button variant="outline" onClick={refresh}>Refresh</Button></header>
    {summary.isPending ? <LoadingState label="Loading gallery summary" /> : summary.isError ? <Card><p role="alert">{summary.error.message}</p><Button onClick={() => void summary.refetch()}>Retry summary</Button></Card> : <Card><dl className="grid gap-4 sm:grid-cols-3">{[["Published photos", summary.data.totalApproved], ["Pending review", summary.data.pendingReview], ["Uploaded today", summary.data.uploadedToday]].map(([name,value]) => <div key={name}><dt className="text-sm text-sub">{name}</dt><dd className="text-2xl font-semibold tabular-nums">{value}</dd></div>)}</dl></Card>}
    {notice && <p role="status">{notice}</p>}
    <UploadPanel context={c} uploaded={refresh} />
    <section className="space-y-4" aria-label="Gallery photos">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <label>Category<Select value={category ?? ""} onChange={e => filter("category", e.target.value)}><option value="">All categories</option>{GALLERY_CATEGORIES.map(v => <option key={v} value={v}>{label(v)}</option>)}</Select></label>
        <label>Stage<Select value={stage ?? ""} onChange={e => filter("stage", e.target.value)}><option value="">All stages</option>{PROJECT_PROGRESS_STAGES.map(v => <option key={v} value={v}>{label(v)}</option>)}</Select></label>
        <label>Status<Select value={status ?? ""} onChange={e => filter("status", e.target.value)}><option value="">All statuses</option>{GALLERY_STATUSES.map(v => <option key={v} value={v}>{label(v)}</option>)}</Select></label>
        <label>From date<Input type="date" value={dateFrom} onChange={e => filter("dateFrom",e.target.value)} /></label><label>To date<Input type="date" value={dateTo} onChange={e => filter("dateTo",e.target.value)} /></label>
      </div>
      {(category || stage || status || dateFrom || dateTo) && <Button variant="outline" onClick={() => router.replace(pathname)}>Clear filters</Button>}
      {invalid ? <p role="alert">Enter valid dates with the end date on or after the start date.</p> : list.isPending ? <LoadingState label="Loading site photos" /> : list.isError ? <Card><p role="alert">{list.error.message}</p><Button onClick={() => void list.refetch()}>Retry gallery</Button></Card> : <>
        {list.isFetching && <p role="status">Refreshing gallery…</p>}
        {!list.data.items.length && <Card>{category || stage || status || dateFrom || dateTo ? "No photos match these filters." : "No site photos yet. Add a photo to start your project diary."}</Card>}
        {[...groups].map(([day, entries], index, all) => <section key={day} className="space-y-3">
          {(index === 0 || all[index-1][0].slice(0,7) !== day.slice(0,7)) && <h2 className="mt-6 text-xl font-semibold">{new Intl.DateTimeFormat("en-IN", { month: "long", year: "numeric" }).format(new Date(`${day}T12:00:00`))}</h2>}
          <h3 className="text-sm font-semibold text-sub">{new Intl.DateTimeFormat("en-IN", { weekday: "short", day: "numeric", month: "short" }).format(new Date(`${day}T12:00:00`))}</h3>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-6">{entries.map(entry => <article key={entry.id} className="min-w-0 rounded-card border border-hairline bg-surface p-2"><PrivateImage org={c.org} project={c.project} id={entry.id} onOpen={() => setSelected(entry)} alt={entry.caption || `${label(entry.category)} photo`} /><button className="mt-2 w-full rounded-inner p-2 text-left focus-visible:ring-2 focus-visible:ring-lime" onClick={() => setSelected(entry)}><span className="block text-sm font-semibold">{label(entry.category)} · {label(entry.status)}</span><span className="block truncate text-sm text-sub">{entry.caption || entry.uploadedBy}</span><span className="block text-sm underline">View photo</span></button></article>)}</div>
        </section>)}
        <nav aria-label="Gallery pages" className="flex flex-wrap items-center justify-between gap-3"><Button variant="outline" disabled={page <= 1} onClick={() => filter("page",String(page-1))}>Previous</Button><span className="text-sm">Page {page} of {Math.max(1,list.data.pagination.totalPages)} · {list.data.pagination.total} photos</span><Button variant="outline" disabled={page >= list.data.pagination.totalPages} onClick={() => filter("page",String(page+1))}>Next</Button></nav>
      </>}
    </section>
    {selected && <GalleryDetail key={`${selected.id}:${selected.version}`} entry={selected} context={c} close={() => setSelected(null)} changed={message => { if (message) setNotice(message); refresh(); }} />}
  </div>;
}
export function GalleryPage({ projectId }: { projectId?: string }) {
  return <Suspense fallback={<LoadingState label="Loading Gallery" />}><GalleryWorkspace projectId={projectId}>{context => <ProjectGallery context={context} />}</GalleryWorkspace></Suspense>;
}
