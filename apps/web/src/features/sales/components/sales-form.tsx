"use client";
import { useEffect, useRef, useState } from "react";
import { Button, Dialog, Input, Select, Textarea } from "@/components/ui";
import { failureMessage, instant, label } from "../sales-rules";
export type Field = {
  name: string;
  label: string;
  type?: string;
  required?: boolean;
  min?: number;
  maxLength?: number;
  minLength?: number;
  options?: readonly string[] | { value: string; label: string }[];
  help?: string;
  initial?: string;
  showWhen?: { field: string; value: string };
  requiredWhen?: { field: string; value: string };
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
          const submitted = Object.fromEntries(
            visibleFields.map((f) => [
              f.name,
              (values[f.name] ?? f.initial ?? "").trim(),
            ]),
          );
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
                setValues((v) => ({ ...v, [f.name]: e.target.value }));
              },
            };
            return (
              <div
                key={f.name}
                className={f.type === "textarea" ? "sm:col-span-2" : ""}
              >
                <label htmlFor={props.id} className="mb-1 block">
                  {f.label}
                  {f.required ? " *" : ""}
                </label>
                {f.options && f.options.length > 10 && (
                  <Input
                    aria-label={`Search ${f.label.toLowerCase()} choices`}
                    placeholder="Search choices"
                    value={searches[f.name] ?? ""}
                    onChange={(e) =>
                      setSearches((s) => ({ ...s, [f.name]: e.target.value }))
                    }
                    className="mb-2"
                  />
                )}
                {f.options ? (
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
                ) : f.type === "textarea" ? (
                  <Textarea {...props} maxLength={f.maxLength} />
                ) : (
                  <Input
                    {...props}
                    type={f.type === "uuid" ? "text" : (f.type ?? "text")}
                    pattern={
                      f.type === "uuid"
                        ? "[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}"
                        : undefined
                    }
                    min={f.min}
                    minLength={f.minLength}
                    maxLength={f.maxLength}
                    step={f.type === "number" ? "any" : undefined}
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
              <Button
                type="button"
                variant="outline"
                disabled={pending}
                onClick={async () => {
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
              </Button>
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
