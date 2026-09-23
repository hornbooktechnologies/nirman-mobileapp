"use client";

import { CollectionToolbar } from "@/components/ui/collection-toolbar";
import { Input, Select } from "@/components/ui";

export type AdministrationFilterField = {
  key: string;
  label: string;
  options: { value: string; label: string }[];
  allLabel?: string;
};

export function AdministrationFilters({ name, scope, search, fields, value, onApply, disabled }: {
  name: string;
  scope?: string;
  search?: { value: string; onChange: (value: string) => void; placeholder: string };
  fields: AdministrationFilterField[];
  value: Record<string, string>;
  onApply: (value: Record<string, string>) => void;
  disabled?: boolean;
}) {
  if (!fields.length) return <div className="space-y-2">
    {scope && <p className="text-sm text-sub">{scope}</p>}
    {search && <label className="grid max-w-md gap-1 text-sm font-medium">Search {name}<Input type="search" value={search.value} placeholder={search.placeholder} maxLength={160} onChange={(event) => search.onChange(event.target.value)} disabled={disabled} /></label>}
  </div>;
  const defaults = Object.fromEntries(fields.map((field) => [field.key, ""]));
  return <CollectionToolbar
    name={name}
    scope={scope}
    search={search ? { ...search, maxLength: 160 } : undefined}
    disabled={disabled}
    filters={{
      value,
      defaults,
      count: fields.filter((field) => Boolean(value[field.key])).length,
      onApply,
      fields: (draft, setDraft, id) => <div className="grid gap-4">
        {fields.map((field) => <label key={field.key} htmlFor={`${id}-${field.key}`} className="grid gap-1 text-sm font-medium">
          {field.label}
          <Select id={`${id}-${field.key}`} value={draft[field.key] ?? ""} onChange={(event) => setDraft({ ...draft, [field.key]: event.target.value })}>
            <option value="">{field.allLabel ?? `All ${field.label.toLowerCase()}`}</option>
            {draft[field.key] && !field.options.some((option) => option.value === draft[field.key]) && <option value={draft[field.key]}>{draft[field.key]}</option>}
            {field.options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </Select>
        </label>)}
      </div>,
    }}
  />;
}
