export const kharchiKey = (organizationId: string, projectId: string) => ["kharchi", organizationId, projectId] as const;

export function effectiveKharchiProject<T extends { id: string; permissions: readonly string[] }>(projects: readonly T[], id: string) {
  return projects.find(project => project.id === id && project.permissions.includes("kharchi:read"));
}

export function amountError(value: string, outstanding?: string) {
  if (!/^\d+(\.\d{1,2})?$/.test(value) || !Number.isFinite(Number(value)) || Number(value) <= 0) return "Enter a positive amount with up to two decimal places.";
  if (outstanding !== undefined && Math.round(Number(value) * 100) > Math.round(Number(outstanding) * 100)) return "A decrease cannot exceed the outstanding balance.";
  return "";
}

export function retainAttempt<T>(previous: { input: T; idempotencyKey: string } | null, input: T, key: () => string) {
  return previous ?? { input, idempotencyKey: key() };
}
export function uncertainFailure(status?: number) { return !status || status >= 500 || status === 408; }
