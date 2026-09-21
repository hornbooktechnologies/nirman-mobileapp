import type { SalesSiteVisit } from "./types/sales.types";
export const visitActionable = (status: string) =>
  status === "SCHEDULED" || status === "RESCHEDULED";
export function validateVisit(values: Record<string, string>) {
  const errors: Record<string, string> = {};
  if (
    values.attendeeCount &&
    (!/^\d+$/.test(values.attendeeCount) ||
      Number(values.attendeeCount) < 1 ||
      Number(values.attendeeCount) > 1000)
  )
    errors.attendeeCount = "Enter a whole number from 1 to 1,000.";
  if (values.status === "RESCHEDULED" && !values.scheduledAt)
    errors.scheduledAt = "Enter the new scheduled date and time.";
  return errors;
}
// The API has no version token. Compare every mutable field before submitting;
// this detects intervening edits but cannot replace atomic backend concurrency.
export const visitSnapshot = (v: SalesSiteVisit) =>
  JSON.stringify([
    v.id,
    v.leadId,
    v.status,
    v.scheduledAt,
    v.assignedSalesperson,
    v.attendeeCount,
    v.customerFeedback,
    v.objectionsConcerns,
    v.nextAction,
    v.completedAt,
  ]);
