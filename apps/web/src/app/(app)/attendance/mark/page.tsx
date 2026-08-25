import { Suspense } from "react";
import { LoadingState } from "@/components/ui";
import { MarkAttendancePage } from "@/features/attendance";

export default function MarkAttendanceRoute() {
  return <Suspense fallback={<LoadingState label="Loading daily Attendance" />}><MarkAttendancePage /></Suspense>;
}
