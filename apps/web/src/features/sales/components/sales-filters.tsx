"use client";

import { CollectionToolbar } from "@/components/ui/collection-toolbar";
import { Input, Select } from "@/components/ui";
import { label } from "../sales-rules";
import { useState } from "react";

export type SalesFilterField = {
  key: string;
  name: string;
  options?: readonly string[];
  optionLabels?: Record<string, string>;
  emptyLabel?: string;
  type?: "date";
};

export function SalesFilters({
  name,
  value,
  fields,
  search,
  scope,
  validate,
  onApply,
}: {
  name: string;
  value: Record<string, string>;
  fields: SalesFilterField[];
  search?: { value: string; placeholder: string; onChange: (value: string) => void; maxLength?: number };
  scope?: string;
  validate?: (value: Record<string, string>) => string | null;
  onApply: (value: Record<string, string>) => void | boolean;
}) {
  const [issue, setIssue] = useState<string | null>(null);
  const defaults = Object.fromEntries(fields.map((field) => [field.key, ""]));
  return (
    <CollectionToolbar
      name={name}
      search={search}
      scope={scope}
      filters={{
        value,
        defaults,
        count: fields.filter((field) => Boolean(value[field.key])).length,
        onApply: (draft) => {
          const nextIssue = validate?.(draft) ?? null;
          setIssue(nextIssue);
          if (nextIssue) return false;
          return onApply(draft);
        },
        fields: (draft, setDraft, id) => {
          const update = (next: Record<string, string>) => {
            setIssue(null);
            setDraft(next);
          };
          return (
          <div className="grid gap-4">
            {issue && <p role="alert" className="text-sm text-danger">{issue}</p>}
            {fields.map((field) => (
              <label key={field.key} htmlFor={`${id}-${field.key}`} className="grid gap-1 text-sm font-medium">
                {field.name}
                {field.options ? (
                  <Select
                    id={`${id}-${field.key}`}
                    value={draft[field.key] ?? ""}
                    onChange={(event) => update({ ...draft, [field.key]: event.target.value })}
                  >
                    <option value="">{field.emptyLabel ?? `All ${field.name.toLowerCase()}`}</option>
                    {draft[field.key] && !field.options.includes(draft[field.key]) && (
                      <option value={draft[field.key]}>{field.optionLabels?.[draft[field.key]] ?? draft[field.key]}</option>
                    )}
                    {field.options.map((option) => (
                      <option key={option} value={option}>{field.optionLabels?.[option] ?? label(option)}</option>
                    ))}
                  </Select>
                ) : (
                  <Input
                    id={`${id}-${field.key}`}
                    type={field.type ?? "text"}
                    value={draft[field.key] ?? ""}
                    onChange={(event) => update({ ...draft, [field.key]: event.target.value })}
                  />
                )}
              </label>
            ))}
          </div>
          );
        },
      }}
    />
  );
}
