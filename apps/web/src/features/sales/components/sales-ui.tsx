import { Button, Card, StatusBadge } from "@/components/ui";
import { failureMessage, label } from "../sales-rules";
export function Failure({
  error,
  retry,
}: {
  error: unknown;
  retry: () => void;
}) {
  return (
    <Card>
      <p role="alert">{failureMessage(error)}</p>
      <Button variant="outline" onClick={retry}>
        Refresh / retry
      </Button>
    </Card>
  );
}
export function Status({ value }: { value: string }) {
  return (
    <StatusBadge
      className="text-sm"
      tone={
        ["CONFIRMED", "COMPLETED", "BOOKED", "AVAILABLE", "APPROVED", "SELECTED"].includes(value)
          ? "success"
          : ["LOST", "CANCELLED", "MISSED", "INVALID", "BLOCKED", "WAITLISTED", "HIGH_INTENT", "UNAVAILABLE"].includes(value)
            ? "warning"
            : "neutral"
      }
    >
      {label(value)}
    </StatusBadge>
  );
}
export const dateTime = (value: string | null, timezone: string) =>
  value
    ? new Intl.DateTimeFormat("en-IN", {
        dateStyle: "medium",
        timeStyle: "short",
        timeZone: timezone,
      }).format(new Date(value))
    : "Not provided";
export const money = (value: number | null) =>
  value === null
    ? "Not provided"
    : new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 2,
      }).format(value);
