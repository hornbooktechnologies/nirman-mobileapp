/** Client validation mirrors Project DTO limits and the service date-order rule. */
export const PROJECT_TEXT_LIMITS = {
  name: 120, projectCode: 40, line1: 180, line2: 180,
  city: 100, state: 100, postalCode: 20, description: 2000,
} as const;

export type ProjectValidationField = keyof typeof PROJECT_TEXT_LIMITS | "startDate" | "expectedCompletionDate";
export type ProjectValidationIssue = { rule: "required" | "maxLength" | "date" | "completionBeforeStart"; limit?: number };

function validDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T12:00:00Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export function projectValidationIssues(values: Partial<Record<ProjectValidationField, string | null>>) {
  const errors: Partial<Record<ProjectValidationField, ProjectValidationIssue>> = {};
  if (!values.name?.trim()) errors.name = { rule: "required" };
  for (const [field, limit] of Object.entries(PROJECT_TEXT_LIMITS)) {
    if ((values[field as keyof typeof PROJECT_TEXT_LIMITS]?.length ?? 0) > limit) {
      errors[field as keyof typeof PROJECT_TEXT_LIMITS] = { rule: "maxLength", limit };
    }
  }
  for (const field of ["startDate", "expectedCompletionDate"] as const) {
    if (values[field] && !validDate(values[field])) errors[field] = { rule: "date" };
  }
  if (values.startDate && values.expectedCompletionDate && !errors.startDate && !errors.expectedCompletionDate && values.expectedCompletionDate < values.startDate) {
    errors.expectedCompletionDate = { rule: "completionBeforeStart" };
  }
  return errors;
}
