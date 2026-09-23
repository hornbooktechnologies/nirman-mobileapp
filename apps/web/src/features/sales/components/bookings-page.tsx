"use client";
import Link from "next/link";
import { Suspense } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { BOOKING_STATUSES } from "@nirman-app/shared";
import { Button, Card, LoadingState } from "@/components/ui";
import { CollectionPagination } from "@/components/ui/collection-toolbar";
import { SalesWorkspace, type SalesContext } from "./sales-workspace";
import { useBookings } from "../hooks/use-bookings";
import { Failure, Status, money } from "./sales-ui";
import { SalesFilters } from "./sales-filters";
import { salesDetailUrl, salesListUrl } from "../sales-view";
function Bookings({ c }: { c: SalesContext }) {
  const params = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const term = (params.get("search") ?? "").slice(0, 160);
  const status = BOOKING_STATUSES.find((s) => s === params.get("status"));
  const date = (key: string) =>
    /^\d{4}-\d{2}-\d{2}$/.test(params.get(key) ?? "") ? params.get(key)! : "";
  const from = date("bookedFrom");
  const to = date("bookedTo");
  const page = Math.max(1, Math.floor(Number(params.get("page")) || 1));
  function filter(key: string, value: string) {
    router.replace(salesListUrl(pathname, params, { [key]: value }, key === "page" ? [] : ["page"]), { scroll: false });
  }
  const invalid = Boolean(from && to && from > to);
  const bookings = useBookings(
    c.org,
    c.project,
    {
      search: term || undefined,
      status: status || undefined,
      bookedFrom: from || undefined,
      bookedTo: to || undefined,
    },
    !invalid,
  );
  const rows = bookings.data ?? [];
  const current = Math.min(page, Math.max(1, Math.ceil(rows.length / 25)));
  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Bookings</h1>
          <p className="text-sub">
            Confirm bookings from a customer’s lead. Review conversion and
            cancellation history here.
          </p>
        </div>
        <Button
          variant="outline"
          disabled={bookings.isFetching || invalid}
          onClick={() => void bookings.refetch()}
        >
          Refresh
        </Button>
      </header>
      {c.active && c.permissions.includes("leads:convert") && (
        <Link className="underline" href={`/projects/${c.project}/sales/leads`}>
          Choose a lead to confirm a booking
        </Link>
      )}
      <SalesFilters
        name="bookings"
        search={{ value: term, placeholder: "Customer, mobile, reference or unit", maxLength: 160, onChange: (value) => filter("search", value) }}
        value={{ status: status ?? "", bookedFrom: from, bookedTo: to }}
        fields={[
          { key: "status", name: "Status", options: BOOKING_STATUSES },
          { key: "bookedFrom", name: "Booked from", type: "date" },
          { key: "bookedTo", name: "Booked to", type: "date" },
        ]}
        validate={(value) => value.bookedFrom && value.bookedTo && value.bookedFrom > value.bookedTo ? "Booked to must be on or after Booked from." : null}
        onApply={(value) => router.replace(salesListUrl(pathname, params, value, ["page"]), { scroll: false })}
      />
      {invalid ? (
        <p id="booking-dates" role="alert">
          Booked to must be on or after Booked from.
        </p>
      ) : bookings.isPending ? (
        <LoadingState label="Loading bookings" />
      ) : bookings.isError ? (
        <Failure error={bookings.error} retry={() => void bookings.refetch()} />
      ) : (
        <>
          <p role="status" className="text-sm text-sub">
            {bookings.isFetching
              ? "Refreshing…"
              : `${rows.length} matching bookings`}
          </p>
          {!rows.length ? (
            <Card>No bookings match these filters.</Card>
          ) : (
            <ul className="grid gap-4 lg:grid-cols-2">
              {rows.slice((current - 1) * 25, current * 25).map((b) => (
                <li key={b.id}>
                  <Link
                    className="block h-full rounded-card border border-hairline bg-surface p-5 focus-visible:ring-2 focus-visible:ring-lime"
                    href={salesDetailUrl(`/projects/${c.project}/sales/bookings/${b.id}`, salesListUrl(pathname, params, {}))}
                  >
                    <div className="flex flex-wrap justify-between gap-2">
                      <h2 className="font-semibold break-words">
                        {b.customerName}
                      </h2>
                      <Status value={b.status} />
                    </div>
                    <p>
                      {b.unitNumber ?? "Without a unit"} ·{" "}
                      {b.bookingReference ?? b.customerMobile}
                    </p>
                    <p className="mt-3 font-semibold">
                      {money(b.bookingAmount)}
                    </p>
                    <p className="text-sm text-sub">
                      {b.bookingDate.slice(0, 10)} ·{" "}
                      {b.bookedByName ?? "Booking"}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
          {rows.length > 25 && <CollectionPagination page={current} pageCount={Math.ceil(rows.length / 25)} total={rows.length} busy={bookings.isFetching} onPageChange={(next) => filter("page", String(next))} />}
        </>
      )}
    </div>
  );
}
export function BookingsPage({ projectId }: { projectId?: string }) {
  return (
    <Suspense fallback={<LoadingState label="Loading bookings" />}>
      <SalesWorkspace projectId={projectId} section="bookings">
        {(c) => <Bookings c={c} />}
      </SalesWorkspace>
    </Suspense>
  );
}
