"use client";
import Link from "next/link";
import { Suspense } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { BOOKING_STATUSES } from "@nirman-app/shared";
import { Button, Card, Input, Select, LoadingState } from "@/components/ui";
import { SalesWorkspace, type SalesContext } from "./sales-workspace";
import { useBookings } from "../hooks/use-bookings";
import { Failure, Status, money } from "./sales-ui";
import { label } from "../sales-rules";
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
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    if (key !== "page") next.delete("page");
    router.replace(`${pathname}?${next}`, { scroll: false });
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
      <Card>
        <form
          className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
          onSubmit={(e) => {
            e.preventDefault();
            filter(
              "search",
              String(new FormData(e.currentTarget).get("search") ?? "").trim(),
            );
          }}
        >
          <label>
            Search bookings
            <Input
              key={term}
              name="search"
              defaultValue={term}
              maxLength={160}
              placeholder="Customer, mobile, reference or unit"
            />
          </label>
          <label>
            Status
            <Select
              value={status ?? ""}
              onChange={(e) => filter("status", e.target.value)}
            >
              <option value="">All statuses</option>
              {BOOKING_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {label(s)}
                </option>
              ))}
            </Select>
          </label>
          <label>
            Booked from
            <Input
              type="date"
              value={from}
              onChange={(e) => filter("bookedFrom", e.target.value)}
            />
          </label>
          <label>
            Booked to
            <Input
              type="date"
              value={to}
              aria-invalid={invalid}
              aria-describedby={invalid ? "booking-dates" : undefined}
              onChange={(e) => filter("bookedTo", e.target.value)}
            />
          </label>
          <Button type="submit" variant="outline">
            Search
          </Button>
        </form>
      </Card>
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
                    href={`/projects/${c.project}/sales/bookings/${b.id}`}
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
          {rows.length > 25 && (
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                disabled={current === 1}
                onClick={() => filter("page", String(current - 1))}
              >
                Previous
              </Button>
              <span>
                Page {current} of {Math.ceil(rows.length / 25)}
              </span>
              <Button
                variant="outline"
                disabled={current * 25 >= rows.length}
                onClick={() => filter("page", String(current + 1))}
              >
                Next
              </Button>
            </div>
          )}
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
