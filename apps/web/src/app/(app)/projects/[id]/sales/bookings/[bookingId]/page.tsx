import { BookingDetailPage } from "@/features/sales/components/booking-detail-page";

type BookingDetailRouteProps = {
  params: Promise<{ id: string; bookingId: string }>;
  searchParams: Promise<{ created?: string }>;
};

export default async function BookingDetailRoute({
  params,
  searchParams,
}: BookingDetailRouteProps) {
  const [{ id, bookingId }, { created }] = await Promise.all([
    params,
    searchParams,
  ]);

  return (
    <BookingDetailPage
      projectId={id}
      bookingId={bookingId}
      created={created === "1"}
    />
  );
}
