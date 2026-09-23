export const materialKey = (org: string, project: string) =>
  ["materials", org, project] as const;
export function materialProject<
  T extends { id: string; permissions: readonly string[] },
>(projects: T[], id: string) {
  return projects.find(
    (p) => p.id === id && p.permissions.includes("materials:read"),
  );
}
export const actionPermissions: Record<string, string> = {
  EDIT: "materials:update",
  SUBMIT: "materials:update",
  CANCEL: "materials:update",
  APPROVE: "materials:approve-final",
  RETURN: "materials:approve-final",
  REJECT: "materials:approve-final",
  RECORD_PURCHASE: "materials:record-purchase",
  RECORD_DELIVERY: "materials:record-delivery",
};
export function materialActions(
  actions: string[],
  permissions: readonly string[],
  active: boolean,
) {
  return active
    ? actions.filter(
        (action) =>
          actionPermissions[action] &&
          (["APPROVE", "RETURN", "REJECT"].includes(action)
            ? permissions.includes("materials:read") || permissions.includes("materials:approve-final")
            : permissions.includes(actionPermissions[action])),
      )
    : [];
}
export const uncertainFailure = (status?: number) =>
  !status || status === 408 || status >= 500;
export function retainAttempt<T>(
  attempt: { input: T; idempotencyKey: string } | null,
  input: T,
  key: () => string,
) {
  return attempt ?? { input, idempotencyKey: key() };
}
export function decimalError(value: string, places: number, positive = false) {
  return !new RegExp(`^\\d+(?:\\.\\d{1,${places}})?$`).test(value) ||
    !Number.isFinite(Number(value)) ||
    (positive && Number(value) <= 0)
    ? `Enter ${positive ? "a positive" : "a non-negative"} number with at most ${places} decimal places.`
    : "";
}
export const label = (value: string) =>
  value
    .toLowerCase()
    .replaceAll("_", " ")
    .replace(/^./, (c) => c.toUpperCase());
