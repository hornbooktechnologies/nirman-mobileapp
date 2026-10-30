"use client";

import { useState } from "react";

export type FieldErrors<K extends string = string> = Partial<Record<K, string>>;

export function focusFirstInvalid(form: HTMLFormElement) {
  requestAnimationFrame(() => {
    const input = form.querySelector<HTMLElement>('[aria-invalid="true"]');
    input?.focus();
    input?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  });
}

/** Keep untouched fields quiet; revalidate every field that has been visited. */
export function useFieldValidation<T, K extends string>(values: T, validate: (values: T) => FieldErrors<K>) {
  const [touched, setTouched] = useState<Partial<Record<K, boolean>>>({});
  const [submitted, setSubmitted] = useState(false);
  const allErrors = Object.fromEntries(Object.entries(validate(values)).filter(([, message]) => Boolean(message))) as FieldErrors<K>;
  const errors = Object.fromEntries(Object.entries(allErrors).filter(([key]) => submitted || touched[key as K])) as FieldErrors<K>;
  return {
    errors,
    blur: (field: K) => setTouched((current) => ({ ...current, [field]: true })),
    check: (form: HTMLFormElement) => {
      setSubmitted(true);
      if (!Object.keys(allErrors).length) return true;
      focusFirstInvalid(form);
      return false;
    },
  };
}
