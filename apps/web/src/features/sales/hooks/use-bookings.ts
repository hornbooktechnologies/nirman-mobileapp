import { useQuery } from "@tanstack/react-query";
import { salesKey } from "../sales-rules";
import { bookingService } from "../services/booking.service";
import type { BookingQuery } from "../types/booking.types";
export const useBookings = (
  o: string,
  p: string,
  query: BookingQuery,
  enabled = true,
) =>
  useQuery({
    queryKey: [...salesKey(o, p), "bookings", query],
    queryFn: ({ signal }) => bookingService.list(o, p, query, signal),
    enabled,
  });
export const useBooking = (o: string, p: string, id: string) =>
  useQuery({
    queryKey: [...salesKey(o, p), "booking", id],
    queryFn: ({ signal }) => bookingService.detail(o, p, id, signal),
  });
