import { Suspense } from "react";
import { AttendancePage } from "@/features/attendance";
import { LoadingState } from "@/components/ui";

export default function AttendanceRoute() {
  return <Suspense fallback={<LoadingState label="Loading Attendance" />}><AttendancePage /></Suspense>;
}
