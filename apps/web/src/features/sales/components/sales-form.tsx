"use client";
import { RefreshButton } from "@/components/ui/refresh-button";

import { SearchInput } from "@/components/ui/search-input";
import { useEffect, useRef, useState } from "react";
import { Button, Checkbox, Dialog, Input, Select, Textarea } from "@/components/ui";
import { failureMessage, instant, label } from "../sales-rules";
import {
  salesNumberError,
  type SalesNumericRule,
} from "../sales-number";
import { SalesSearchableSelect } from "./sales-searchable-select";
export type Field = {
  name: string;
  label: string;
  type?: string;
  numeric?: SalesNumericRule;
  required?: boolean;
  min?: number;
  maxLength?: number;
  minLength?: number;
  options?: readonly string[] | { value: string; label: string }[];
  help?: string;
  initial?: string;
  showWhen?: { field: string; value: string };
  requiredWhen?: { field: string; value: string };
  searchable?: {
    searchValue: string;
    onSearchChange: (value: string) => void;
    loading?: boolean;
    placeholder?: string;
  };
};
export function SalesForm({
  title,
  fields,
  save,
  close,
  refresh,
  validate,
  timezone,
  children,
}: {
  title: string;
  fields: Field[];
  save: (values: Record<string, string>) => Promise<void>;
  close: () => void;
  refresh: () => Promise<unknown>;
  timezone?: string;
  children?: React.ReactNode;
  validate?: (
    values: Record<string, string>,
  ) => Record<string, string | undefined>;
}) {
  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(fields.map((f) => [f.name, f.initial ?? ""])),
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [review, setReview] = useState(false);
  const [searches, setSearches] = useState<Record<string, string>>({});
  const dirty = useRef(false);
  const locked = useRef(false);
  const form = useRef<HTMLFormElement>(null);
  const visibleFields = fields
    .filter((f) => !f.showWhen || values[f.showWhen.field] === f.showWhen.value)
    .map((f) => ({ ...f, required: f.required || Boolean(f.requiredWhen && values[f.requiredWhen.field] === f.requiredWhen.value) }));
  useEffect(() => {
    const unload = (e: BeforeUnloadEvent) => {
      if (dirty.current || locked.current) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    const navigate = (e: MouseEvent) => {
      if (
        !(e.target instanceof Element) ||
        !e.target.closest("a[href]") ||
        e.ctrlKey ||
        e.metaKey ||
        e.shiftKey
      )
        return;
      if (
        locked.current ||
        (dirty.current && !window.confirm("Discard unsaved changes?"))
      ) {
        e.preventDefault();
        e.stopPropagation();
      }
    };
    window.addEventListener("beforeunload", unload);
    document.addEventListener("click", navigate, true);
    return () => {
      window.removeEventListener("beforeunload", unload);
      document.removeEventListener("click", navigate, true);
    };
  }, []);
  function dismiss() {
    if (
      !locked.current &&
      (!dirty.current || window.confirm("Discard unsaved changes?"))
    )
      close();
  }
  function submittedValues(source = values) {
    return Object.fromEntries(
      visibleFields.map((field) => [
        field.name,
        (source[field.name] ?? field.initial ?? "").trim(),
      ]),
    );
  }
  function inlineFieldError(field: Field, source: Record<string, string>) {
    const submitted = submittedValues(source);
    const value = submitted[field.name];
    if (field.required && !value) return "This field is required.";
    return (
      (field.numeric ? salesNumberError(value, field.numeric) : undefined) ??
      validate?.(submitted)?.[field.name]
    );
  }
  return (
    <Dialog open title={title} className="max-w-2xl" onOpenChange={dismiss}>
      <form
        ref={form}
        className="space-y-4 text-base"
        noValidate
        onSubmit={async (e) => {
          e.preventDefault();
          if (locked.current || review) return;
          const next: Record<string, string> = {};
          const submitted = submittedValues();
          for (const f of visibleFields) {
            const input = form.current?.elements.namedItem(
              f.name,
            ) as HTMLInputElement | null;
            if (input && !input.validity.valid)
              next[f.name] = input.validationMessage;
            const value = submitted[f.name];
            if (value && f.minLength && value.length < f.minLength)
              next[f.name] = `Enter at least ${f.minLength} characters.`;
            if (f.maxLength && value.length > f.maxLength)
              next[f.name] = `Use no more than ${f.maxLength} characters.`;
            if (f.required && !value) next[f.name] = "This field is required.";
            if (f.numeric) {
              const message = salesNumberError(value, f.numeric);
              if (message) next[f.name] = message;
            }
            if (value && f.type === "datetime-local" && timezone) {
              try {
                instant(value, timezone);
              } catch (cause) {
                next[f.name] = (cause as Error).message;
              }
            }
          }
          for (const [name, message] of Object.entries(
            validate?.(submitted) ?? {},
          ))
            if (message) next[name] = message;
          setErrors(next);
          if (Object.keys(next).length) {
            (
              form.current?.elements.namedItem(
                Object.keys(next)[0],
              ) as HTMLElement
            )?.focus();
            return;
          }
          locked.current = true;
          setPending(true);
          setError("");
          try {
            await save(submitted);
            dirty.current = false;
          } catch (cause) {
            setError(failureMessage(cause));
            setReview(true);
          } finally {
            locked.current = false;
            setPending(false);
          }
        }}
      >
        {children}
        <div className="grid gap-4 sm:grid-cols-2">
          {visibleFields.map((f) => {
            const props = {
              id: `sales-${f.name}`,
              name: f.name,
              value: values[f.name] ?? f.initial ?? "",
              required: f.required,
              disabled: pending,
              "aria-invalid": Boolean(errors[f.name]),
              "aria-describedby": errors[f.name]
                ? `error-${f.name}`
                : undefined,
              onChange: (
                e: React.ChangeEvent<
                  HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
                >,
              ) => {
                dirty.current = true;
                const nextValue = e.target.value;
                const nextValues = { ...values, [f.name]: nextValue };
                setValues(nextValues);
                if (f.numeric && errors[f.name]) {
                  const message = inlineFieldError(f, nextValues);
                  setErrors((currentErrors) => ({
                    ...currentErrors,
                    [f.name]: message ?? "",
                  }));
                }
              },
            };
            return (
              <div
                key={f.name}
                className={f.type === "textarea" ? "sm:col-span-2" : ""}
              >
                {f.type !== "checkbox" && <label htmlFor={props.id} className="mb-1 block">{f.label}{f.required ? " *" : ""}</label>}
                {f.options && f.options.length > 10 && !f.searchable && (
                  <SearchInput
                    aria-label={`Search ${f.label.toLowerCase()} choices`}
                    placeholder="Search choices"
                    value={searches[f.name] ?? ""}
                    onValueChange={(e) => setSearches((s) => ({ ...s, [f.name]: e }))}
                    className="mb-2"
                  />
                )}
                {f.options && f.searchable ? (
                  <SalesSearchableSelect
                    id={props.id}
                    name={f.name}
                    value={props.value}
                    options={f.options.filter((option): option is { value: string; label: string } => typeof option !== "string")}
                    searchValue={f.searchable.searchValue}
                    onSearchChange={f.searchable.onSearchChange}
                    onValueChange={(value) => {
                      dirty.current = true;
                      setValues((current) => ({ ...current, [f.name]: value }));
                      setErrors((current) => ({ ...current, [f.name]: "" }));
                    }}
                    disabled={pending}
                    invalid={Boolean(errors[f.name])}
                    loading={f.searchable.loading}
                    placeholder={f.searchable.placeholder}
                  />
                ) : f.options && f.type !== "multi-checkbox" ? (
                  <Select {...props}>
                    <option value="">Select…</option>
                    {f.options
                      .filter(
                        (o) =>
                          (typeof o === "string" ? label(o) : o.label)
                            .toLowerCase()
                            .includes((searches[f.name] ?? "").toLowerCase()) ||
                          (typeof o === "string" ? o : o.value) === (values[f.name] ?? f.initial ?? ""),
                      )
                      .map((o) =>
                        typeof o === "string" ? (
                          <option key={o} value={o}>
                            {label(o)}
                          </option>
                        ) : (
                          <option key={o.value} value={o.value}>
                            {o.label}
                          </option>
                        ),
                      )}
                  </Select>
                ) : f.type === "checkbox" ? (
                  <Checkbox id={props.id} name={f.name} checked={props.value === "true"} disabled={pending} label={f.label} onChange={(event) => { dirty.current = true; setValues((current) => ({ ...current, [f.name]: event.target.checked ? "true" : "" })); }} />
                ) : f.type === "multi-checkbox" ? (
                  <fieldset className="space-y-2 rounded-inner border border-hairline p-3"><legend className="px-1 text-sm text-sub">Choose one or more files</legend>{f.options?.filter((option): option is { value: string; label: string } => typeof option !== "string").map((option) => { const checked = props.value.split(",").filter(Boolean).includes(option.value); return <Checkbox key={option.value} checked={checked} label={option.label} onChange={() => { dirty.current = true; const current = props.value.split(",").filter(Boolean); setValues((values) => ({ ...values, [f.name]: (checked ? current.filter((value) => value !== option.value) : [...current, option.value]).join(",") })); }} />; })}</fieldset>
                ) : f.type === "textarea" ? (
                  <Textarea {...props} maxLength={f.maxLength} />
                ) : (
                  <Input
                    {...props}
                    type={
                      f.numeric || f.type === "uuid"
                        ? "text"
                        : (f.type ?? "text")
                    }
                    inputMode={
                      f.numeric?.kind === "integer"
                        ? "numeric"
                        : f.numeric?.kind === "decimal"
                          ? "decimal"
                          : undefined
                    }
                    pattern={
                      f.type === "uuid"
                        ? "[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}"
                        : undefined
                    }
                    min={f.numeric ? undefined : f.min}
                    minLength={f.minLength}
                    maxLength={f.maxLength}
                    onBlur={
                      f.numeric
                        ? () => {
                            const message = inlineFieldError(f, values);
                            setErrors((current) => ({
                              ...current,
                              [f.name]: message ?? "",
                            }));
                          }
                        : undefined
                    }
                  />
                )}
                {f.help && <p className="text-sm text-sub">{f.help}</p>}
                {errors[f.name] && (
                  <p className="text-sm text-danger" id={`error-${f.name}`}>
                    {errors[f.name]}
                  </p>
                )}
              </div>
            );
          })}
        </div>
        {error && (
          <div role="alert">
            <p>{error}</p>
            {review && (
              <RefreshButton
                type="button"
                variant="outline"
                disabled={pending}
                onRefresh={async () => {
                  if (locked.current) return;
                  locked.current = true;
                  setPending(true);
                  try {
                    await refresh();
                    setReview(false);
                    setError(
                      "Current data refreshed. Review your input before submitting again.",
                    );
                  } catch (cause) {
                    setError(failureMessage(cause));
                  } finally {
                    locked.current = false;
                    setPending(false);
                  }
                }}
              >
                Refresh current data
              </RefreshButton>
            )}
          </div>
        )}
        <div className="flex justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            disabled={pending}
            onClick={dismiss}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={pending || review}>
            {pending ? "Saving…" : "Save"}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
