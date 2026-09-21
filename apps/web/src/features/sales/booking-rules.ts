import type { BookingInput } from "./types/booking.types";
export function eligibleBookingUnit(
  unit: { status: string; blockedForLeadId: string | null },
  lead: string,
) {
  return (
    unit.status === "AVAILABLE" ||
    (unit.status === "BLOCKED" && unit.blockedForLeadId === lead)
  );
}
export function bookingPermission(
  permissions: readonly string[],
  active: boolean,
  hasUnit: boolean,
) {
  return (
    active &&
    permissions.includes("leads:convert") &&
    (!hasUnit || permissions.includes("inventory:book"))
  );
}
export function bookingAmountError(value: string) {
  return value && (!Number.isFinite(Number(value)) || Number(value) < 0)
    ? "Enter a finite, non-negative amount."
    : undefined;
}
export function bookingRejected(error: unknown) {
  const e = error as { statusCode?: number; code?: string };
  return (
    [400, 403, 404, 409, 422].includes(e.statusCode ?? 0) &&
    e.code !== "IDEMPOTENCY_CONFLICT"
  );
}
// Once submitted, uncertain retries must replay the exact logical request.
export function bookingAttempt(
  previous: BookingInput | null,
  input: Omit<BookingInput, "idempotencyKey">,
  key: () => string,
): BookingInput {
  if (previous) {
    const { idempotencyKey, ...original } = previous;
    if (JSON.stringify(original) !== JSON.stringify(input))
      throw new Error(
        "A booking request is unresolved. Restore the original inputs and retry, or check Bookings before starting another request.",
      );
    return { ...original, idempotencyKey };
  }
  return { ...input, idempotencyKey: key() };
}
