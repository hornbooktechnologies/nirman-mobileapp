import { Suspense } from "react";
import { WorkCalendarPage } from "@/features/calendar";
import { LoadingState } from "@/components/ui";

export default function WorkCalendarRoute() {
  return <Suspense fallback={<LoadingState label="Loading Work Calendar" />}><WorkCalendarPage /></Suspense>;
}
