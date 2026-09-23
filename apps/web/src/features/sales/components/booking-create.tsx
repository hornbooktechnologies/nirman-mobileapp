"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button, LoadingState } from "@/components/ui";
import { SalesForm } from "./sales-form";
import { Failure } from "./sales-ui";
import type { SalesContext } from "./sales-workspace";
import type { SalesLead } from "../types/sales.types";
import type { BookingInput } from "../types/booking.types";
import {
  bookingAmountError,
  bookingAttempt,
  bookingPermission,
  bookingRejected,
  eligibleBookingUnit,
} from "../booking-rules";
import { canWriteLead, localTime, salesKey } from "../sales-rules";
import { bookingService } from "../services/booking.service";
import { inventoryService } from "../services/inventory.service";
import { salesService } from "../services/sales.service";
import { useSalesLifetime } from "../hooks/use-sales";
export function BookingCreate({
  c,
  lead,
  returnTo,
}: {
  c: SalesContext;
  lead: SalesLead;
  returnTo?: string;
}) {
  const [open, setOpen] = useState(false);
  const [attempt, setAttempt] = useState<BookingInput | null>(null);
  const live = useSalesLifetime();
  const router = useRouter();
  const cache = useQueryClient();
  const can = canWriteLead(
    c.permissions,
    c.active,
    "leads:convert",
    lead,
    c.user,
  );
  const pickUnit =
    c.permissions.includes("inventory:read") &&
    c.permissions.includes("inventory:book");
  const units = useQuery({
    queryKey: [...salesKey(c.org, c.project), "booking-units", lead.id],
    queryFn: ({ signal }) =>
      inventoryService.units(c.org, c.project, {}, signal),
    enabled: open && pickUnit,
  });
  if (!can || (lead.currentStage === "BOOKED" && !attempt)) return null;
  return (
    <>
      <Button onClick={() => setOpen(true)}>Confirm booking</Button>
      {open && (
        <SalesForm
          title={`Confirm booking · ${lead.customerName}`}
          close={() => setOpen(false)}
          fields={[
            {
              name: "unitId",
              label: "Unit",
              options: [
                { value: "none", label: "Without a unit" },
                ...(attempt?.unitId
                  ? [
                      {
                        value: attempt.unitId,
                        label: "Unit from pending booking request",
                      },
                    ]
                  : []),
                ...(units.data ?? [])
                  .filter(
                    (u) =>
                      u.id !== attempt?.unitId &&
                      eligibleBookingUnit(u, lead.id),
                  )
                  .map((u) => ({
                    value: u.id,
                    label: `${u.unitNumber} · ${u.unitType}`,
                  })),
              ],
              initial: attempt?.unitId ?? "none",
            },
            {
              name: "bookingDate",
              label: "Booking date",
              type: "date",
              required: true,
              initial:
                attempt?.bookingDate ??
                localTime(new Date().toISOString(), c.timezone).slice(0, 10),
            },
            {
              name: "bookingAmount",
              label: "Booking amount (INR)",
              type: "number",
              min: 0,
              initial: attempt?.bookingAmount?.toString() ?? "",
            },
            {
              name: "bookingReference",
              label: "Booking reference",
              maxLength: 120,
              initial: attempt?.bookingReference ?? "",
            },
          ]}
          validate={(v) => ({
            bookingAmount: bookingAmountError(v.bookingAmount),
            unitId:
              !attempt &&
              v.unitId !== "none" &&
              (!pickUnit ||
                !units.data?.some(
                  (u) => u.id === v.unitId && eligibleBookingUnit(u, lead.id),
                ))
                ? "Select an available unit or choose Without a unit."
                : undefined,
          })}
          refresh={async () => {
            await cache.invalidateQueries({
              queryKey: salesKey(c.org, c.project),
            });
          }}
          save={async (v) => {
            const input = {
              leadId: lead.id,
              ...(v.unitId !== "none" ? { unitId: v.unitId } : {}),
              bookingDate: v.bookingDate,
              ...(v.bookingAmount !== ""
                ? { bookingAmount: Number(v.bookingAmount) }
                : {}),
              ...(v.bookingReference
                ? { bookingReference: v.bookingReference }
                : {}),
            };
            if (
              !bookingPermission(c.permissions, c.active, Boolean(input.unitId))
            )
              throw new Error(
                "You do not have permission to confirm this booking.",
              );
            const request = bookingAttempt(
              attempt,
              input,
              () => `booking-${crypto.randomUUID()}`,
            );
            if (!attempt) {
              const current = await salesService.lead(
                c.org,
                c.project,
                lead.id,
              );
              if (!live.current) return;
              if (
                current.updatedAt !== lead.updatedAt ||
                current.currentStage === "BOOKED"
              )
                throw new Error(
                  "The lead changed. Refresh and review before confirming.",
                );
            }
            setAttempt(request);
            const result = await bookingService
              .create(c.org, c.project, request)
              .catch((error: unknown) => {
                if (live.current && bookingRejected(error)) setAttempt(null);
                throw error;
              });
            if (!live.current) return;
            setAttempt(null);
            setOpen(false);
            void cache.invalidateQueries({
              queryKey: salesKey(c.org, c.project),
            });
            router.push(
              `/projects/${c.project}/sales/bookings/${result.id}?created=1${returnTo ? `&returnTo=${encodeURIComponent(returnTo)}` : ""}`,
            );
          }}
        >
          <p>
            {lead.customerName} · {lead.primaryMobile}. Customer details and
            source are taken from the lead by the server.
          </p>
          <p className="text-sm text-sub">
            After a failed request, keep the same inputs when retrying. The same
            request key is retained while this lead page remains open.
          </p>
          {pickUnit && units.isPending && (
            <LoadingState label="Loading available units" />
          )}
          {pickUnit && units.isError && (
            <Failure error={units.error} retry={() => void units.refetch()} />
          )}
        </SalesForm>
      )}
    </>
  );
}
