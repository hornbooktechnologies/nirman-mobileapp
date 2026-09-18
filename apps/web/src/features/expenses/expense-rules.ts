export const expenseKey = (org: string, project: string) =>
  ["expenses", org, project] as const;
export const expenseScope = (
  user: string | undefined,
  org: string | null,
  project?: string,
) => JSON.stringify([user, org, project]);
export function expenseProject<
  T extends { id: string; permissions: readonly string[] },
>(projects: T[], id: string) {
  return projects.find(
    (p) => p.id === id && p.permissions.includes("expenses:read"),
  );
}
const actionPermissions: Record<string, string> = {
  EDIT: "expenses:update",
  SUBMIT: "expenses:update",
  CANCEL: "expenses:update",
  APPROVE: "expenses:approve",
  REJECT: "expenses:reject",
  ADJUST: "expenses:adjust",
};
export function expenseActions(
  actions: readonly string[],
  permissions: readonly string[],
  active: boolean,
) {
  return active
    ? actions.filter(
        (action) =>
          Object.hasOwn(actionPermissions, action) &&
          permissions.includes(actionPermissions[action]),
      )
    : [];
}
export const label = (value: string) =>
  value === "UPI"
    ? value
    : value
        .toLowerCase()
        .replaceAll("_", " ")
        .replace(/^./, (c) => c.toUpperCase());
export const uncertainFailure = (status?: number) =>
  !status || status === 408 || status >= 500;
export function retainAttempt<T>(
  attempt: { input: T; idempotencyKey: string } | null,
  input: T,
  key: () => string,
) {
  return attempt ?? { input, idempotencyKey: key() };
}
export function amountError(
  value: string,
  recognized?: string,
  decrease = false,
) {
  if (
    !/^\d+(?:\.\d{1,2})?$/.test(value) ||
    !Number.isFinite(Number(value)) ||
    Number(value) <= 0
  )
    return "Enter a positive amount with at most 2 decimal places.";
  if (
    decrease &&
    recognized !== undefined &&
    Number(value) > Number(recognized)
  )
    return "The decrease cannot exceed the current recognized amount.";
  return "";
}
export function commandFailure(status?: number, code?: string) {
  if (status === 403 || status === 401 || code === "PROJECT_STATUS_INVALID")
    return "denied";
  if (
    status === 409 ||
    [
      "EXPENSE_STATUS_TRANSITION_INVALID",
      "EXPENSE_ACTION_NOT_ALLOWED",
      "EXPENSE_SELF_APPROVAL_FORBIDDEN",
      "EXPENSE_RECOGNIZED_AMOUNT_NEGATIVE",
    ].includes(code ?? "")
  )
    return "stale";
  return uncertainFailure(status) ? "uncertain" : "rejected";
}
