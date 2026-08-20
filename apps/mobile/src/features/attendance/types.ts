import type {
  AttendanceStatus,
  AttendanceRecord,
  ProjectWorkerRosterItem,
} from "@nirman-app/shared";

export type MobileAttendanceRecord = AttendanceRecord;

export type AttendanceEntry = {
  workerAssignmentId: string;
  status: AttendanceStatus;
  checkIn?: string | null;
  checkOut?: string | null;
  notes?: string | null;
};

export type AttendanceRosterItem = ProjectWorkerRosterItem & {
  attendance?: MobileAttendanceRecord;
};
