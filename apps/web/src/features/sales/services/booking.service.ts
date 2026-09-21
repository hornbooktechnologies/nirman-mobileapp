import { api } from "@/lib/api/api-client";
import type {
  BookingQuery,
  BookingInput,
  BookingCancellation,
  SalesBooking,
} from "../types/booking.types";
const base = (o: string, p: string) =>
  `/organizations/${encodeURIComponent(o)}/projects/${encodeURIComponent(p)}/sales/bookings`;
export const bookingService = {
  list: (o: string, p: string, params: BookingQuery, signal?: AbortSignal) =>
    api.get<SalesBooking[]>(base(o, p), { params, signal }),
  detail: (o: string, p: string, id: string, signal?: AbortSignal) =>
    api.get<SalesBooking>(`${base(o, p)}/${encodeURIComponent(id)}`, {
      signal,
    }),
  create: (o: string, p: string, input: BookingInput) =>
    api.post<SalesBooking>(base(o, p), input),
  cancel: (o: string, p: string, id: string, input: BookingCancellation) =>
    api.post<SalesBooking>(
      `${base(o, p)}/${encodeURIComponent(id)}/cancel`,
      input,
    ),
};
