import { ApiError } from "@/lib/api/api-client";

export function workerToday(timeZone = "Asia/Kolkata") {
  return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}

export function workerError(error: unknown) {
  if (error instanceof ApiError) {
    if (error.statusCode === 403) return "You no longer have permission for this action. Refresh access and try again.";
    if (error.code === "WORKER_ASSIGNMENT_PRIMARY_PERIOD_CONFLICT") return "This change would leave a primary-project period outside its assignment. Correct the period first, or confirm ending it with the assignment.";
    if (error.code === "WORKER_ASSIGNMENT_FUTURE_PRIMARY_PERIOD_CONFLICT") return "A later primary-project period exists. Correct that scheduled period before ending this assignment.";
    if (error.code === "WORKER_PRIMARY_PERIOD_OVERLAP") return "These dates overlap another primary-project period. Refresh history and correct or end that period first.";
  }
  return error instanceof Error ? error.message : "Unable to save. Your input has been kept; please try again.";
}

export function workerRate(value: string | number | null | undefined) {
  return value === null || value === undefined || value === "" ? "Not set" : `${new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(Number(value))}/day`;
}
