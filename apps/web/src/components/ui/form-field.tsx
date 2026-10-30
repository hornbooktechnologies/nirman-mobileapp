"use client";

import { useId, type ReactNode } from "react";
import { FieldError, FieldLabel } from "./typography";

export function FormField({ label, required, error, className, children }: {
  label: string;
  required?: boolean;
  error?: string;
  className?: string;
  children: (props: { id: string; invalid: boolean; "aria-describedby"?: string }) => ReactNode;
}) {
  const id = useId();
  return (
    <div className={className ?? "grid gap-1"}>
      <FieldLabel htmlFor={id}>{label}{required ? <span className="text-danger" aria-label="required"> *</span> : null}</FieldLabel>
      {children({ id, invalid: Boolean(error), "aria-describedby": error ? `${id}-error` : undefined })}
      {error ? <FieldError id={`${id}-error`} role="alert">{error}</FieldError> : null}
    </div>
  );
}
