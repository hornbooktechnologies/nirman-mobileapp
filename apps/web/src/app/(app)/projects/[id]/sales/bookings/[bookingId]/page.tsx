import { BookingDetailPage } from "@/features/sales/components/booking-detail-page";
export default async function Page({params,searchParams}:{params:Promise<{id:string;bookingId:string}>;searchParams:Promise<{created?:string}>}) { const {id,bookingId}=await params; const {created}=await searchParams; return <BookingDetailPage projectId={id} bookingId={bookingId} created={created === "1"}/>; }
