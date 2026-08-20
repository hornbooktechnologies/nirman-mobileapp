import type {
  AttendanceStatus,
  ProjectWorkerRosterItem,
} from "@nirman-app/shared";

export type AttendanceRecord = {
  id: string;
  organizationId: string;
  projectId: string;
  workerAssignmentId: string;
  workDate: string;
  status: AttendanceStatus;
  checkIn?: string | null;
  checkOut?: string | null;
  notes?: string | null;
  markedBy: string;
  markedAt: string;
  lastEditedBy?: string | null;
  lastEditedAt?: string | null;
};

export type AttendanceEntryInput = {
  workerAssignmentId: string;
  status: AttendanceStatus;
  checkIn?: string | null;
  checkOut?: string | null;
  notes?: string | null;
};

export type AttendancePageRow = ProjectWorkerRosterItem & {
  attendance: AttendanceRecord | null;
};
