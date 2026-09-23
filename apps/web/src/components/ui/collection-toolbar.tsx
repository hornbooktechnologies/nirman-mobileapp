"use client";

import { SlidersHorizontal } from "lucide-react";
import { useId, useState, type ReactNode } from "react";
import { Button } from "./button";
import { Drawer } from "./drawer";
import { Input } from "./input";
import { FieldLabel } from "./typography";

export interface CollectionFilters<T> {
  value: T;
  defaults: T;
  count: number;
  onApply: (value: T) => void | boolean;
  fields: (
    draft: T,
    setDraft: (value: T) => void,
    idPrefix: string,
  ) => ReactNode;
}

export function CollectionToolbar<T>({
  name,
  search,
  scope,
  filters,
  disabled = false,
}: {
  name: string;
  search?: {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    maxLength?: number;
  };
  scope?: ReactNode;
  filters: CollectionFilters<T>;
  disabled?: boolean;
}) {
  const id = useId();
  const [open, setOpen] = useState(false);
  return (
    <div className="space-y-3">
      {scope ? (
        <div className="break-words text-[13px] leading-5 text-sub">
          {scope}
        </div>
      ) : null}
      <div className="flex min-w-0 flex-wrap items-end gap-3">
        {search ? (
          <div className="min-w-0 flex-1 basis-56">
            <FieldLabel htmlFor={`${id}-search`} className="mb-1 block">
              Search {name}
            </FieldLabel>
            <Input
              id={`${id}-search`}
              type="search"
              value={search.value}
              disabled={disabled}
              placeholder={search.placeholder}
              maxLength={search.maxLength}
              onChange={(event) => search.onChange(event.target.value)}
            />
          </div>
        ) : null}
        <Button
          variant="outline"
          disabled={disabled}
          aria-haspopup="dialog"
          aria-expanded={open}
          aria-controls={open ? `${id}-filters` : undefined}
          onClick={() => setOpen(true)}
        >
          <SlidersHorizontal size={16} aria-hidden="true" />
          Filters{filters.count > 0 ? ` (${filters.count})` : ""}
          <span className="sr-only"> for {name}</span>
        </Button>
      </div>
      {open ? (
        <FilterDraft
          key={id}
          id={`${id}-filters`}
          name={name}
          scope={scope}
          filters={filters}
          onClose={() => setOpen(false)}
        />
      ) : null}
    </div>
  );
}

// Mount only while open: cancel discards the draft; reopening copies applied values.
function FilterDraft<T>({
  id,
  name,
  scope,
  filters,
  onClose,
}: {
  id: string;
  name: string;
  scope?: ReactNode;
  filters: CollectionFilters<T>;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState(filters.value);
  return (
    <Drawer
      id={id}
      open
      title={`Filter ${name}`}
      description="Changes apply only when you select Apply filters."
      onOpenChange={(next) => {
        if (!next) onClose();
      }}
      footer={
        <>
          <Button variant="ghost" onClick={() => setDraft(filters.defaults)}>
            Reset to defaults
          </Button>
          <Button type="submit" form={`${id}-form`}>
            Apply filters
          </Button>
        </>
      }
    >
      <form
        id={`${id}-form`}
        className="space-y-5"
        onSubmit={(event) => {
          event.preventDefault();
          if (filters.onApply(draft) !== false) onClose();
        }}
      >
        {scope ? (
          <p className="break-words text-[13px] text-sub">{scope}</p>
        ) : null}
        {filters.fields(draft, setDraft, id)}
      </form>
    </Drawer>
  );
}

export function CollectionPagination({
  page,
  pageCount,
  total,
  busy,
  onPageChange,
}: {
  page: number;
  pageCount: number;
  total: number;
  busy?: boolean;
  onPageChange: (page: number) => void;
}) {
  return (
    <nav
      aria-label="Results pages"
      className="mt-4 flex flex-wrap items-center justify-between gap-3"
    >
      <p className="text-[13px] leading-5 text-sub" aria-live="polite">
        {total} matching {total === 1 ? "result" : "results"} · Page {page} of{" "}
        {Math.max(1, pageCount)}
      </p>
      <div className="flex flex-wrap gap-2">
        <Button
          variant="outline"
          disabled={busy || page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          Previous
        </Button>
        <Button
          variant="outline"
          disabled={busy || page >= pageCount}
          onClick={() => onPageChange(page + 1)}
        >
          Next
        </Button>
      </div>
    </nav>
  );
}
