"use client";

import { useState } from "react";
import { MATERIAL_REQUEST_STATUSES } from "@nirman-app/shared";
import { CollectionToolbar } from "@/components/ui/collection-toolbar";
import { Input, Select } from "@/components/ui";
import { validDate } from "@/features/attendance/date-utils";
import { label } from "../material-rules";
import type { MaterialsQuery } from "../types/materials.types";

export const defaultMaterialsQuery: MaterialsQuery = {
  page: 1, pageSize: 20, sortBy: "updatedAt", sortOrder: "desc",
};

export function MaterialsCollectionFilters({ query, search, onSearch, onApply, members, canReadMembers, memberSearch, onMemberSearch, memberState }: {
  query: MaterialsQuery;
  search: string;
  onSearch: (value: string) => void;
  onApply: (value: MaterialsQuery) => void;
  members: { memberId: string; user: { name: string } }[];
  canReadMembers: boolean;
  memberSearch: string;
  onMemberSearch: (value: string) => void;
  memberState?: React.ReactNode;
}) {
  const [rangeError, setRangeError] = useState("");
  const count = [query.status, query.requiredFrom, query.requiredTo, query.requestedByMemberId, query.responsibleContractorMemberId].filter(Boolean).length + (query.sortBy !== "updatedAt" ? 1 : 0) + (query.sortOrder === "asc" ? 1 : 0);
  return <CollectionToolbar
    name="material requests"
    scope="Current project · Approval confirms a request; purchases and deliveries are recorded separately."
    search={{ value: search, onChange: onSearch, placeholder: "Material or category", maxLength: 160 }}
    filters={{
      value: query, defaults: defaultMaterialsQuery, count,
      onApply: next => {
        if ((next.requiredFrom && !validDate(next.requiredFrom)) || (next.requiredTo && !validDate(next.requiredTo)) || (next.requiredFrom && next.requiredTo && next.requiredFrom > next.requiredTo)) { setRangeError("Choose valid dates with the end on or after the start."); return false; }
        setRangeError(""); onApply({ ...next, search: query.search, page: 1 });
      },
      fields: (draft, setDraft, id) => <div className="space-y-4">
        <label htmlFor={`${id}-status`} className="block">Status<Select id={`${id}-status`} value={draft.status ?? ""} onChange={e => setDraft({ ...draft, status: e.target.value as MaterialsQuery["status"] || undefined })}><option value="">All statuses</option>{MATERIAL_REQUEST_STATUSES.map(s => <option key={s} value={s}>{label(s)}</option>)}</Select></label>
        <div className="grid gap-3 sm:grid-cols-2">
          <label htmlFor={`${id}-from`} className="block">Required from<Input id={`${id}-from`} type="date" max={draft.requiredTo} value={draft.requiredFrom ?? ""} onChange={e => setDraft({ ...draft, requiredFrom: e.target.value || undefined })} /></label>
          <label htmlFor={`${id}-to`} className="block">Required to<Input id={`${id}-to`} type="date" min={draft.requiredFrom} value={draft.requiredTo ?? ""} onChange={e => setDraft({ ...draft, requiredTo: e.target.value || undefined })} /></label>
        </div>
        {rangeError ? <p role="alert" className="text-danger">{rangeError}</p> : null}
        {canReadMembers ? <div className="space-y-3"><label htmlFor={`${id}-member-search`} className="block">Find member<Input id={`${id}-member-search`} value={memberSearch} onChange={e => onMemberSearch(e.target.value)} /></label>{(["requestedByMemberId", "responsibleContractorMemberId"] as const).map((key, i) => <label key={key} htmlFor={`${id}-${key}`} className="block">{i === 0 ? "Requested by" : "Responsible member"}<Select id={`${id}-${key}`} value={draft[key] ?? ""} onChange={e => setDraft({ ...draft, [key]: e.target.value || undefined })}><option value="">All members</option>{draft[key] && !members.some(m => m.memberId === draft[key]) ? <option value={draft[key]}>Selected member ({draft[key]})</option> : null}{members.filter(m => m.memberId === draft[key] || m.user.name.toLowerCase().includes(memberSearch.toLowerCase())).map(m => <option key={m.memberId} value={m.memberId}>{m.user.name}</option>)}</Select></label>)}{memberState}</div> : (draft.requestedByMemberId || draft.responsibleContractorMemberId) ? <p className="text-sm text-sub">Member filters are active. Reset to defaults to remove them.</p> : null}
        <div className="grid gap-3 sm:grid-cols-2"><label htmlFor={`${id}-sort`} className="block">Sort by<Select id={`${id}-sort`} value={draft.sortBy ?? "updatedAt"} onChange={e => setDraft({ ...draft, sortBy: e.target.value as MaterialsQuery["sortBy"] })}><option value="updatedAt">Last updated</option><option value="requestedOn">Request date</option><option value="requiredByDate">Required date</option><option value="materialName">Material name</option></Select></label><label htmlFor={`${id}-order`} className="block">Order<Select id={`${id}-order`} value={draft.sortOrder ?? "desc"} onChange={e => setDraft({ ...draft, sortOrder: e.target.value as MaterialsQuery["sortOrder"] })}><option value="desc">Descending</option><option value="asc">Ascending</option></Select></label></div>
      </div>,
    }}
  />;
}
