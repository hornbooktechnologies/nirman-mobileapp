export type ConstraintControl = {
  value: string;
  required: boolean;
  disabled: boolean;
  willValidate: boolean;
  type?: string;
  minLength?: number;
  maxLength?: number;
  min?: string;
  max?: string;
  validity: Pick<ValidityState, "valueMissing" | "typeMismatch" | "patternMismatch" | "rangeUnderflow" | "rangeOverflow" | "stepMismatch" | "badInput" | "customError">;
  validationMessage: string;
};

/** Return our own readable copy without triggering the browser validation UI. */
export function constraintError(control: ConstraintControl, label: string): string | undefined {
  if (control.disabled || !control.willValidate) return;
  const { value, validity } = control;
  if (validity.valueMissing || (control.required && !value.trim())) return `${label} is required.`;
  if (validity.badInput) return "Enter a valid number.";
  if (validity.customError) return control.validationMessage;
  if (!value) return;
  if (validity.typeMismatch) return control.type === "email" ? "Enter a valid email address." : "Enter a valid URL.";
  if (validity.patternMismatch) return `Enter a valid ${label.toLowerCase()}.`;
  if (control.minLength && control.minLength > 0 && value.length < control.minLength) return `Enter at least ${control.minLength} characters.`;
  if (control.maxLength !== undefined && control.maxLength >= 0 && value.length > control.maxLength) return `Use no more than ${control.maxLength} characters.`;
  if (validity.rangeUnderflow) return control.type === "date" ? `Choose a date on or after ${control.min}.` : `Enter a value of at least ${control.min}.`;
  if (validity.rangeOverflow) return control.type === "date" ? `Choose a date on or before ${control.max}.` : `Enter a value of at most ${control.max}.`;
  if (validity.stepMismatch) return "Enter a value using the allowed increment.";
}
