"use client";
import { SITE_VISIT_STATUSES, type SiteVisitStatus } from "@nirman-app/shared";
import { SalesForm, type Field } from "./sales-form";
import type { SalesContext } from "./sales-workspace";
import type {
  SalesSiteVisit,
  SiteVisitInput,
  SiteVisitUpdate,
} from "../types/sales.types";
import { localTime, instant } from "../sales-rules";
import { validateVisit } from "../site-visit-rules";
export function SiteVisitForm({
  c,
  visit,
  close,
  refresh,
  save,
}: {
  c: SalesContext;
  visit?: SalesSiteVisit;
  close: () => void;
  refresh: () => Promise<unknown>;
  save: (input: SiteVisitInput | SiteVisitUpdate) => Promise<void>;
}) {
  const fields: Field[] = [
    ...(visit
      ? [
          {
            name: "status",
            label: "Outcome",
            required: true,
            options: SITE_VISIT_STATUSES.filter((s) => s !== "SCHEDULED"),
            initial: "COMPLETED",
          },
        ]
      : []),
    {
      name: "scheduledAt",
      label: `Scheduled time (${c.timezone})`,
      type: "datetime-local",
      required: !visit,
      initial: visit ? localTime(visit.scheduledAt, c.timezone) : "",
      help: visit
        ? "Used only for Rescheduled. Completed, Cancelled and No show outcomes cannot be edited afterwards."
        : "Uses the lead’s assigned salesperson, or you if the lead is unassigned.",
    },
    {
      name: "attendeeCount",
      label: "Attendee count",
      type: "number",
      min: 1,
      initial: visit?.attendeeCount?.toString() ?? "",
      help: "1–1,000 attendees.",
    },
    ...(visit
      ? [
          {
            name: "customerFeedback",
            label: "Customer feedback",
            type: "textarea",
            maxLength: 4000,
            initial: visit.customerFeedback ?? "",
          },
          {
            name: "objectionsConcerns",
            label: "Objections and concerns",
            type: "textarea",
            maxLength: 4000,
            initial: visit.objectionsConcerns ?? "",
          },
          {
            name: "nextAction",
            label: "Next action",
            type: "textarea",
            maxLength: 4000,
            initial: visit.nextAction ?? "",
          },
        ]
      : []),
  ];
  return (
    <SalesForm
      title={
        visit ? `Update visit · ${visit.customerName}` : "Schedule site visit"
      }
      fields={fields}
      timezone={c.timezone}
      validate={validateVisit}
      close={close}
      refresh={refresh}
      save={(v) =>
        save(
          visit
            ? {
                status: v.status as SiteVisitStatus,
                ...(v.status === "RESCHEDULED"
                  ? { scheduledAt: instant(v.scheduledAt, c.timezone) }
                  : {}),
                ...(v.attendeeCount
                  ? { attendeeCount: Number(v.attendeeCount) }
                  : {}),
                customerFeedback: v.customerFeedback || undefined,
                objectionsConcerns: v.objectionsConcerns || undefined,
                nextAction: v.nextAction || undefined,
              }
            : {
                scheduledAt: instant(v.scheduledAt, c.timezone),
                ...(v.attendeeCount
                  ? { attendeeCount: Number(v.attendeeCount) }
                  : {}),
              },
        )
      }
    />
  );
}
