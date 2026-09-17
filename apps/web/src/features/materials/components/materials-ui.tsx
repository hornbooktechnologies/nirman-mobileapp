import type { ReactNode } from "react";
import { Button, Card, StatusBadge } from "@/components/ui";
import { label } from "../material-rules";
export const money = (value: string | null) =>
  value == null
    ? "Not provided"
    : new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
      }).format(Number(value));
export const date = (value: string | null) =>
  value
    ? new Intl.DateTimeFormat("en-IN", { dateStyle: "medium" }).format(
        new Date(`${value.slice(0, 10)}T12:00:00`),
      )
    : "Not provided";
export function MaterialStatus({ status }: { status: string }) {
  const tone = ["APPROVED", "DELIVERED"].includes(status)
    ? "success"
    : ["REJECTED", "CANCELLED"].includes(status)
      ? "danger"
      : status.startsWith("PENDING") || status === "RETURNED_FOR_CHANGES"
        ? "warning"
        : ["ORDERED", "PARTIALLY_DELIVERED"].includes(status)
          ? "info"
          : "neutral";
  return (
    <StatusBadge className="text-sm" tone={tone}>
      {label(status)}
    </StatusBadge>
  );
}
export function Failure({ error, retry }: { error: Error; retry: () => void }) {
  return (
    <Card>
      <p role="alert" className="text-danger">
        {error.message}
      </p>
      <Button variant="outline" onClick={retry}>
        Retry
      </Button>
    </Card>
  );
}
export function Facts({ rows }: { rows: [string, ReactNode][] }) {
  return (
    <dl className="grid gap-4 sm:grid-cols-2">
      {rows.map(([name, value]) => (
        <div key={name} className="min-w-0">
          <dt className="text-sm text-sub">{name}</dt>
          <dd className="break-words font-medium tabular-nums">
            {value ?? "Not provided"}
          </dd>
        </div>
      ))}
    </dl>
  );
}
