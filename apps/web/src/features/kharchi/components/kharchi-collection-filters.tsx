"use client";

import { KHARCHI_BALANCE_STATUSES, KHARCHI_PAYMENT_METHODS, type KharchiSummary } from "@nirman-app/shared";
import { Input, Select } from "@/components/ui";
import { CollectionToolbar } from "@/components/ui/collection-toolbar";
import type { KharchiQuery } from "../services/kharchi.service";

export const defaultKharchiFilters: KharchiQuery = { sortBy: "requestDate", sortOrder: "desc" };

export function KharchiCollectionFilters({ value, workers, assignmentId, error, onApply }: {
  value: KharchiQuery;
  workers: KharchiSummary["workers"];
  assignmentId?: string;
  error: string;
  onApply: (next: KharchiQuery) => boolean;
}) {
  const count = [value.status, value.paymentMethod, value.workerId, value.startDate, value.endDate].filter(Boolean).length + (value.sortBy && value.sortBy !== "requestDate" ? 1 : 0) + (value.sortOrder === "asc" ? 1 : 0);
  return <div className="space-y-2">
    <CollectionToolbar
      name="advances"
      scope={<>Project advances. Summary totals follow worker and paid-date filters; search, status and method apply to the list and CSV. {assignmentId ? `Assignment ledger: ${assignmentId}` : ""}</>}
      search={{ value: value.search ?? "", onChange: search => onApply({ ...value, search: search || undefined }), placeholder: "Worker name or code", maxLength: 120 }}
      filters={{
        value, defaults: { ...defaultKharchiFilters, workerAssignmentId: assignmentId }, count,
        onApply,
        fields: (draft, setDraft, id) => <div className="space-y-4">
          <label htmlFor={`${id}-status`} className="block text-sm font-semibold">Balance status<Select id={`${id}-status`} value={draft.status ?? ""} onChange={event => setDraft({ ...draft, status: event.target.value as KharchiQuery["status"] || undefined })}><option value="">All statuses</option>{KHARCHI_BALANCE_STATUSES.map(status => <option key={status} value={status}>{status.replaceAll("_", " ").toLowerCase()}</option>)}</Select></label>
          <label htmlFor={`${id}-method`} className="block text-sm font-semibold">Payment method<Select id={`${id}-method`} value={draft.paymentMethod ?? ""} onChange={event => setDraft({ ...draft, paymentMethod: event.target.value as KharchiQuery["paymentMethod"] || undefined })}><option value="">All methods</option>{KHARCHI_PAYMENT_METHODS.map(method => <option key={method} value={method}>{method.replaceAll("_", " ").toLowerCase()}</option>)}</Select></label>
          <label htmlFor={`${id}-worker`} className="block text-sm font-semibold">Worker<Select id={`${id}-worker`} value={draft.workerId ?? ""} onChange={event => setDraft({ ...draft, workerId: event.target.value || undefined })}><option value="">All workers</option>{workers.map(worker => <option key={worker.workerId} value={worker.workerId}>{worker.workerName} · {worker.workerCode}</option>)}</Select></label>
          <div className="grid gap-3 sm:grid-cols-2"><label htmlFor={`${id}-from`} className="block text-sm font-semibold">Paid from<Input id={`${id}-from`} type="date" max={draft.endDate} value={draft.startDate ?? ""} onChange={event => setDraft({ ...draft, startDate: event.target.value || undefined })} /></label><label htmlFor={`${id}-through`} className="block text-sm font-semibold">Paid through<Input id={`${id}-through`} type="date" min={draft.startDate} value={draft.endDate ?? ""} onChange={event => setDraft({ ...draft, endDate: event.target.value || undefined })} /></label></div>
          {error ? <p role="alert" className="text-danger">{error}</p> : null}
          <div className="grid gap-3 sm:grid-cols-2"><label htmlFor={`${id}-sort`} className="block text-sm font-semibold">Sort by<Select id={`${id}-sort`} value={draft.sortBy ?? "requestDate"} onChange={event => setDraft({ ...draft, sortBy: event.target.value as KharchiQuery["sortBy"] })}><option value="requestDate">Date paid</option><option value="createdAt">Date recorded</option><option value="workerName">Worker name</option><option value="outstandingAmount">Outstanding amount</option></Select></label><label htmlFor={`${id}-order`} className="block text-sm font-semibold">Order<Select id={`${id}-order`} value={draft.sortOrder ?? "desc"} onChange={event => setDraft({ ...draft, sortOrder: event.target.value as KharchiQuery["sortOrder"] })}><option value="desc">Descending</option><option value="asc">Ascending</option></Select></label></div>
          {draft.workerAssignmentId ? <p className="break-all text-sm text-sub">Assignment filter: {draft.workerAssignmentId}</p> : null}
        </div>,
      }}
    />
  </div>;
}
