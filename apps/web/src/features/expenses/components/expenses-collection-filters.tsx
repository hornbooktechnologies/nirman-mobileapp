"use client";

import { useState } from "react";
import { EXPENSE_CATEGORIES, EXPENSE_PAYMENT_METHODS, EXPENSE_STATUSES } from "@nirman-app/shared";
import { CollectionToolbar } from "@/components/ui/collection-toolbar";
import { Input, Select } from "@/components/ui";
import { validDate } from "@/features/attendance/date-utils";
import { label } from "../expense-rules";
import type { ExpensesQuery } from "../types/expenses.types";

export const defaultExpensesQuery: ExpensesQuery = { page: 1, pageSize: 25, sortBy: "expenseDate", sortOrder: "desc" };

export function ExpensesCollectionFilters({ query, search, onSearch, onApply, members, canReadMembers, memberSearch, onMemberSearch, memberState }: {
  query: ExpensesQuery;
  search: string;
  onSearch: (value: string) => void;
  onApply: (value: ExpensesQuery) => void;
  members: { memberId: string; user: { name: string } }[];
  canReadMembers: boolean;
  memberSearch: string;
  onMemberSearch: (value: string) => void;
  memberState?: React.ReactNode;
}) {
  const [rangeError, setRangeError] = useState("");
  const count = [query.status, query.category, query.paymentMethod, query.expenseFrom, query.expenseTo, query.recordedByMemberId].filter(Boolean).length + (query.sortBy !== "expenseDate" ? 1 : 0) + (query.sortOrder === "asc" ? 1 : 0);
  return <CollectionToolbar name="expenses" scope="Current project · Summary amounts follow applied date and record filters." search={{ value: search, onChange: onSearch, placeholder: "Description or vendor / payee", maxLength: 160 }} filters={{
    value: query, defaults: defaultExpensesQuery, count,
    onApply: next => {
      if ((next.expenseFrom && !validDate(next.expenseFrom)) || (next.expenseTo && !validDate(next.expenseTo)) || (next.expenseFrom && next.expenseTo && next.expenseFrom > next.expenseTo)) { setRangeError("Choose valid dates with the end on or after the start."); return false; }
      setRangeError(""); onApply({ ...next, search: query.search, page: 1 });
    },
    fields: (draft, setDraft, id) => <div className="space-y-4">
      {([ ["status", "Status", EXPENSE_STATUSES], ["category", "Category", EXPENSE_CATEGORIES], ["paymentMethod", "Payment method", EXPENSE_PAYMENT_METHODS] ] as const).map(([key, title, options]) => <label key={key} htmlFor={`${id}-${key}`} className="block">{title}<Select id={`${id}-${key}`} value={draft[key] ?? ""} onChange={e => setDraft({ ...draft, [key]: e.target.value || undefined })}><option value="">All</option>{options.map(value => <option key={value} value={value}>{label(value)}</option>)}</Select></label>)}
      <div className="grid gap-3 sm:grid-cols-2"><label htmlFor={`${id}-from`} className="block">Expense from<Input id={`${id}-from`} type="date" max={draft.expenseTo} value={draft.expenseFrom ?? ""} onChange={e => { setRangeError(""); setDraft({ ...draft, expenseFrom: e.target.value || undefined }); }} /></label><label htmlFor={`${id}-to`} className="block">Expense to<Input id={`${id}-to`} type="date" min={draft.expenseFrom} value={draft.expenseTo ?? ""} onChange={e => { setRangeError(""); setDraft({ ...draft, expenseTo: e.target.value || undefined }); }} /></label></div>
      {rangeError ? <p role="alert" className="text-danger">{rangeError}</p> : null}
      {canReadMembers ? <div className="space-y-3"><label htmlFor={`${id}-member-search`} className="block">Find member<Input id={`${id}-member-search`} value={memberSearch} onChange={e => onMemberSearch(e.target.value)} /></label><label htmlFor={`${id}-recorder`} className="block">Recorded by<Select id={`${id}-recorder`} value={draft.recordedByMemberId ?? ""} onChange={e => setDraft({ ...draft, recordedByMemberId: e.target.value || undefined })}><option value="">All members</option>{draft.recordedByMemberId && !members.some(m => m.memberId === draft.recordedByMemberId) ? <option value={draft.recordedByMemberId}>Selected member ({draft.recordedByMemberId})</option> : null}{members.filter(m => m.memberId === draft.recordedByMemberId || m.user.name.toLowerCase().includes(memberSearch.toLowerCase())).map(m => <option key={m.memberId} value={m.memberId}>{m.user.name}</option>)}</Select></label>{memberState}</div> : draft.recordedByMemberId ? <p className="text-sm text-sub">Recorder filter is active. Reset to defaults to remove it.</p> : null}
      <div className="grid gap-3 sm:grid-cols-2"><label htmlFor={`${id}-sort`} className="block">Sort by<Select id={`${id}-sort`} value={draft.sortBy ?? "expenseDate"} onChange={e => setDraft({ ...draft, sortBy: e.target.value as ExpensesQuery["sortBy"] })}><option value="expenseDate">Expense date</option><option value="amount">Original amount</option><option value="updatedAt">Last updated</option><option value="description">Description</option></Select></label><label htmlFor={`${id}-order`} className="block">Order<Select id={`${id}-order`} value={draft.sortOrder ?? "desc"} onChange={e => setDraft({ ...draft, sortOrder: e.target.value as ExpensesQuery["sortOrder"] })}><option value="desc">Descending</option><option value="asc">Ascending</option></Select></label></div>
    </div>,
  }} />;
}
