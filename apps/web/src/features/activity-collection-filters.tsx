"use client";

import { useState } from "react";
import { GALLERY_CATEGORIES, GALLERY_STATUSES, PROJECT_PROGRESS_STAGES, type GalleryCategory, type GalleryStatus, type ProjectProgressStage } from "@nirman-app/shared";
import { Input, Select } from "@/components/ui";
import { CollectionToolbar } from "@/components/ui/collection-toolbar";
import { validDate } from "@/features/attendance/date-utils";

export type ProgressHistoryFiltersValue = { stage?: ProjectProgressStage; dateFrom?: string; dateTo?: string };
export type GalleryFiltersValue = ProgressHistoryFiltersValue & { category?: GalleryCategory; status?: GalleryStatus };

function datesValid(value: { dateFrom?: string; dateTo?: string }) {
  return (!value.dateFrom || validDate(value.dateFrom)) && (!value.dateTo || validDate(value.dateTo)) && (!value.dateFrom || !value.dateTo || value.dateFrom <= value.dateTo);
}

export function ProgressHistoryFilters({ value, onApply, stageLabel }: { value: ProgressHistoryFiltersValue; onApply: (value: ProgressHistoryFiltersValue) => void; stageLabel: (value: ProjectProgressStage) => string }) {
  const [error, setError] = useState("");
  return <CollectionToolbar name="progress updates" scope="Current project · Stage history uses the selected date range. Stage cards above show current API values." filters={{
    value, defaults: {}, count: [value.stage, value.dateFrom, value.dateTo].filter(Boolean).length,
    onApply: next => { if (!datesValid(next)) { setError("Choose valid dates with the end on or after the start."); return false; } setError(""); onApply(next); },
    fields: (draft, setDraft, id) => <div className="space-y-4"><label htmlFor={`${id}-stage`} className="block">Stage<Select id={`${id}-stage`} value={draft.stage ?? ""} onChange={event => setDraft({ ...draft, stage: event.target.value as ProjectProgressStage || undefined })}><option value="">All stages</option>{PROJECT_PROGRESS_STAGES.map(stage => <option key={stage} value={stage}>{stageLabel(stage)}</option>)}</Select></label><div className="grid gap-3 sm:grid-cols-2"><label htmlFor={`${id}-from`} className="block">From date<Input id={`${id}-from`} type="date" max={draft.dateTo} value={draft.dateFrom ?? ""} onChange={event => { setError(""); setDraft({ ...draft, dateFrom: event.target.value || undefined }); }} /></label><label htmlFor={`${id}-to`} className="block">To date<Input id={`${id}-to`} type="date" min={draft.dateFrom} value={draft.dateTo ?? ""} onChange={event => { setError(""); setDraft({ ...draft, dateTo: event.target.value || undefined }); }} /></label></div>{error ? <p role="alert" className="text-danger">{error}</p> : null}</div>,
  }} />;
}

export function GalleryCollectionFilters({ value, onApply, label }: { value: GalleryFiltersValue; onApply: (value: GalleryFiltersValue) => void; label: (value: string) => string }) {
  const [error, setError] = useState("");
  return <CollectionToolbar name="project photos" scope="Current project · Stage tags group photos; they do not link a photo to a specific progress update." filters={{
    value, defaults: {}, count: [value.category, value.stage, value.status, value.dateFrom, value.dateTo].filter(Boolean).length,
    onApply: next => { if (!datesValid(next)) { setError("Choose valid dates with the end on or after the start."); return false; } setError(""); onApply(next); },
    fields: (draft, setDraft, id) => <div className="space-y-4">
      <label htmlFor={`${id}-category`} className="block">Category<Select id={`${id}-category`} value={draft.category ?? ""} onChange={event => setDraft({ ...draft, category: event.target.value as GalleryCategory || undefined })}><option value="">All categories</option>{GALLERY_CATEGORIES.map(category => <option key={category} value={category}>{label(category)}</option>)}</Select></label>
      <label htmlFor={`${id}-stage`} className="block">Stage<Select id={`${id}-stage`} value={draft.stage ?? ""} onChange={event => setDraft({ ...draft, stage: event.target.value as ProjectProgressStage || undefined })}><option value="">All stages</option>{PROJECT_PROGRESS_STAGES.map(stage => <option key={stage} value={stage}>{label(stage)}</option>)}</Select></label>
      <label htmlFor={`${id}-status`} className="block">Status<Select id={`${id}-status`} value={draft.status ?? ""} onChange={event => setDraft({ ...draft, status: event.target.value as GalleryStatus || undefined })}><option value="">All statuses</option>{GALLERY_STATUSES.map(status => <option key={status} value={status}>{label(status)}</option>)}</Select></label>
      <div className="grid gap-3 sm:grid-cols-2"><label htmlFor={`${id}-from`} className="block">From date<Input id={`${id}-from`} type="date" max={draft.dateTo} value={draft.dateFrom ?? ""} onChange={event => { setError(""); setDraft({ ...draft, dateFrom: event.target.value || undefined }); }} /></label><label htmlFor={`${id}-to`} className="block">To date<Input id={`${id}-to`} type="date" min={draft.dateFrom} value={draft.dateTo ?? ""} onChange={event => { setError(""); setDraft({ ...draft, dateTo: event.target.value || undefined }); }} /></label></div>{error ? <p role="alert" className="text-danger">{error}</p> : null}
    </div>,
  }} />;
}
