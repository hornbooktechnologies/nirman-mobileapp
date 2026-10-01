import type { SalesActivity } from "./types/sales.types";

export function activityDetails(
  activity: SalesActivity,
  formatDate: (value: string) => string,
): [string, string][] {
  let details = activity.details;
  if (typeof details === "string") {
    try { details = JSON.parse(details); } catch { return [["Notes", details as string]]; }
  }
  if (!details || typeof details !== "object" || Array.isArray(details)) return [];
  const values = details as Record<string, unknown>;
  const rows: [string, string][] = [];
  if (values.bookingId) {
    rows.push(["Booking", activity.bookingReference || (activity.bookingDate ? `Booked on ${formatDate(activity.bookingDate)}` : "Booking reference unavailable")]);
  }
  if (activity.unitNumber) rows.push(["Unit", activity.unitNumber]);
  const fields: Record<string, string> = {
    details: "Notes", source: "Source", from: "Previous stage", to: "New stage",
    restoredLeadStage: "Restored lead stage", restoredUnitStatus: "Restored unit status",
    scheduledAt: "Scheduled for", type: "Type", outcome: "Outcome", notes: "Notes",
    reason: "Reason", status: "Status",
  };
  for (const [key, value] of Object.entries(values)) {
    if (key === "assignedFrom" || key === "assignedTo") {
      rows.push([key === "assignedFrom" ? "Previous owner" : "New owner", value == null ? "Unassigned" : (key === "assignedFrom" ? activity.assignedFromName : activity.assignedToName) || "Name unavailable"]);
    } else if (fields[key] && typeof value === "string" && value) {
      rows.push([fields[key], key === "scheduledAt" ? formatDate(value) : /^[A-Z][A-Z_]+$/.test(value) ? value.toLowerCase().replaceAll("_", " ").replace(/^./, (s) => s.toUpperCase()) : value]);
    }
  }
  return rows;
}
