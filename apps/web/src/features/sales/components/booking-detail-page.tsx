"use client";
import Link from "next/link";
import { Suspense, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { LEAD_STAGES, type LeadStage } from "@nirman-app/shared";
import { Button, Card, LoadingState } from "@/components/ui";
import { SalesWorkspace, type SalesContext } from "./sales-workspace";
import { useBooking } from "../hooks/use-bookings";
import { useLead, useSalesLifetime } from "../hooks/use-sales";
import { SalesForm } from "./sales-form";
import { Failure, Status, dateTime, money } from "./sales-ui";
import { bookingPermission } from "../booking-rules";
import { canWriteLead, label, salesKey } from "../sales-rules";
import { bookingService } from "../services/booking.service";
import type { SalesBooking } from "../types/booking.types";
import { safeSalesRecordReturn, safeSalesReturn, salesDetailUrl } from "../sales-view";
function Cancellation({
  c,
  b,
  close,
  done,
}: {
  c: SalesContext;
  b: SalesBooking;
  close: () => void;
  done: () => void;
}) {
  const live = useSalesLifetime();
  const snapshot = useRef(b);
  const cache = useQueryClient();
  return (
    <SalesForm
      title="Cancel booking"
      close={close}
      fields={[
        {
          name: "cancellationReason",
          label: "Cancellation reason",
          type: "textarea",
          required: true,
          maxLength: 2000,
        },
        {
          name: "restoredLeadStage",
          label: "Restore lead stage",
          required: true,
          options: LEAD_STAGES.filter((s) => s !== "BOOKED"),
          initial:
            b.leadStageBeforeBooking && b.leadStageBeforeBooking !== "BOOKED"
              ? b.leadStageBeforeBooking
              : "NEGOTIATION",
        },
        ...(b.unitId
          ? [
              {
                name: "restoredUnitStatus",
                label: "Restore unit status",
                required: true,
                options: ["AVAILABLE", "UNAVAILABLE"],
                initial:
                  b.unitStatusBeforeBooking === "UNAVAILABLE"
                    ? "UNAVAILABLE"
                    : "AVAILABLE",
              },
            ]
          : []),
      ]}
      refresh={async () => {
        const current = await bookingService.detail(c.org, c.project, b.id);
        snapshot.current = current;
        cache.setQueryData(
          [...salesKey(c.org, c.project), "booking", b.id],
          current,
        );
      }}
      save={async (v) => {
        const current = await bookingService.detail(c.org, c.project, b.id);
        if (!live.current) return;
        if (current.status !== "CONFIRMED")
          throw new Error(
            "This booking has already been cancelled. Close this form and review the current record.",
          );
        if (
          current.updatedAt !== snapshot.current.updatedAt ||
          current.leadCurrentStage !== snapshot.current.leadCurrentStage ||
          current.unitCurrentStatus !== snapshot.current.unitCurrentStatus
        )
          throw new Error(
            "This booking or its linked records changed. Refresh and review the restoration choices.",
          );
        await bookingService.cancel(c.org, c.project, b.id, {
          cancellationReason: v.cancellationReason,
          restoredLeadStage: v.restoredLeadStage as LeadStage,
          ...(b.unitId
            ? {
                restoredUnitStatus: v.restoredUnitStatus as
                  "AVAILABLE" | "UNAVAILABLE",
              }
            : {}),
        });
        if (live.current) done();
      }}
    >
      <p>
        Cancel {b.bookingReference ?? b.customerName} and restore the linked
        records to the selected states. The original conversion and cancellation
        history will be retained.
      </p>
    </SalesForm>
  );
}
function Detail({
  c,
  id,
  created,
}: {
  c: SalesContext;
  id: string;
  created?: boolean;
}) {
  const requestedReturn = useSearchParams().get("returnTo");
  const returnTo = safeSalesRecordReturn(requestedReturn, c.project, ["leads"]) ?? safeSalesReturn(requestedReturn, c.project, "bookings");
  const booking = useBooking(c.org, c.project, id);
  const [cancel, setCancel] = useState(false);
  const [success, setSuccess] = useState(
    created ? "Booking confirmed successfully." : "",
  );
  const cache = useQueryClient();
  if (booking.isPending) return <LoadingState label="Loading booking" />;
  if (booking.isError)
    return (
      <Failure error={booking.error} retry={() => void booking.refetch()} />
    );
  const b = booking.data;
  const rows: [string, string | null][] = [
    ["Lead source", label(b.leadSource)],
    ["Booked by", b.bookedByName ?? b.bookedBy],
    ["First converted by", b.convertedByName ?? b.convertedBy],
    ["First converted at", dateTime(b.convertedAt, c.timezone)],
    [
      "Previous lead stage",
      b.leadStageBeforeBooking ? label(b.leadStageBeforeBooking) : null,
    ],
    ["Current lead stage", label(b.leadCurrentStage)],
    ["Unit", b.unitNumber ?? "Without a unit"],
    ["Unit type", b.unitType],
    [
      "Previous unit status",
      b.unitStatusBeforeBooking ? label(b.unitStatusBeforeBooking) : null,
    ],
    [
      "Current unit status",
      b.unitCurrentStatus ? label(b.unitCurrentStatus) : null,
    ],
    ["Created", dateTime(b.createdAt, c.timezone)],
    ["Updated", dateTime(b.updatedAt, c.timezone)],
  ];
  return (
    <div className="space-y-5">
      <Link
        className="underline"
        href={returnTo}
      >
        Back to {returnTo.includes("/leads/") ? "lead" : "bookings"}
      </Link>
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold break-words">
            {b.customerName}
          </h1>
          <Status value={b.status} />
        </div>
        <Button
          variant="outline"
          disabled={booking.isFetching}
          onClick={() =>
            void cache.invalidateQueries({
              queryKey: salesKey(c.org, c.project),
            })
          }
        >
          Refresh
        </Button>
      </header>
      {success && <p role="status">{success}</p>}
      <Card className="space-y-3">
        <h2 className="text-lg font-semibold">Customer and booking</h2>
        <dl className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[["Mobile", b.customerMobile], ["Reference", b.bookingReference], ["Booking date", b.bookingDate.slice(0, 10)], ["Amount", money(b.bookingAmount)], ["Booked by", b.bookedByName ?? b.bookedBy]].map(([name, value]) => (
            <div key={name}><dt className="text-sm text-sub">{name}</dt><dd className="break-words font-medium">{value || "Not provided"}</dd></div>
          ))}
        </dl>
      </Card>
      <section className="space-y-3" aria-label="Related Sales records">
        <h2 className="text-lg font-semibold">Related records</h2>
        <div className="flex flex-wrap gap-4">
          <Link className="underline" href={salesDetailUrl(`/projects/${c.project}/sales/leads/${b.leadId}`, `/projects/${c.project}/sales/bookings/${id}`)}>Open lead and activity history</Link>
          {b.unitId && c.permissions.includes("inventory:read") && <Link className="underline" href={salesDetailUrl(`/projects/${c.project}/sales/inventory/${b.unitId}`, `/projects/${c.project}/sales/bookings/${id}`)}>Open unit {b.unitNumber}</Link>}
        </div>
      </section>
      <Card className="space-y-3">
        <h2 className="text-lg font-semibold">Conversion and record history</h2>
        <dl className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {rows.map(([name, value]) => (
            <div key={name} className="min-w-0">
              <dt className="text-sm text-sub">{name}</dt>
              <dd className="whitespace-pre-wrap break-words">
                {value ?? "Not provided"}
              </dd>
            </div>
          ))}
        </dl>
      </Card>
      {b.status === "CANCELLED" && (
        <Card>
          <h2 className="text-xl font-semibold">Cancellation history</h2>
          <p className="whitespace-pre-wrap break-words">
            {b.cancellationReason}
          </p>
          <dl className="mt-4 grid gap-4 sm:grid-cols-2">
            {[
              ["Cancelled by", b.cancelledByName ?? b.cancelledBy],
              ["Cancelled at", dateTime(b.cancelledAt, c.timezone)],
              [
                "Restored lead stage",
                b.restoredLeadStage ? label(b.restoredLeadStage) : null,
              ],
              [
                "Restored unit status",
                b.restoredUnitStatus ? label(b.restoredUnitStatus) : null,
              ],
            ].map(([name, value]) => (
              <div key={name}>
                <dt className="text-sm text-sub">{name}</dt>
                <dd>{value ?? "Not applicable"}</dd>
              </div>
            ))}
          </dl>
        </Card>
      )}
      {b.status === "CONFIRMED" &&
        bookingPermission(c.permissions, c.active, Boolean(b.unitId)) && (
          <section className="space-y-3" aria-label="Booking administration">
            <h2 className="text-lg font-semibold">Booking administration</h2>
            <p className="text-sm text-sub">Cancellation requires a reason and explicit lead and unit restoration choices.</p>
            <CancellationAction c={c} b={b} open={() => setCancel(true)} />
          </section>
        )}
      {cancel && (
        <Cancellation
          c={c}
          b={b}
          close={() => setCancel(false)}
          done={() => {
            setCancel(false);
            setSuccess(
              "Booking cancelled. The lead and linked unit have been restored.",
            );
            void cache.invalidateQueries({
              queryKey: salesKey(c.org, c.project),
            });
          }}
        />
      )}
    </div>
  );
}
function CancellationAction({
  c,
  b,
  open,
}: {
  c: SalesContext;
  b: SalesBooking;
  open: () => void;
}) {
  const lead = useLead(c.org, c.project, b.leadId);
  if (lead.isPending)
    return <LoadingState label="Checking cancellation access" />;
  if (lead.isError)
    return <Failure error={lead.error} retry={() => void lead.refetch()} />;
  return canWriteLead(
    c.permissions,
    c.active,
    "leads:convert",
    lead.data,
    c.user,
  ) ? (
    <Button variant="danger" onClick={open}>
      Cancel booking
    </Button>
  ) : null;
}
export function BookingDetailPage({
  projectId,
  bookingId,
  created,
}: {
  projectId: string;
  bookingId: string;
  created?: boolean;
}) {
  return (
    <Suspense fallback={<LoadingState label="Loading booking" />}>
      <SalesWorkspace projectId={projectId} section="bookings">
        {(c) => <Detail key={bookingId} c={c} id={bookingId} created={created} />}
      </SalesWorkspace>
    </Suspense>
  );
}
