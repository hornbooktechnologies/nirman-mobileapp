import type { AttendanceStatus } from "../constants";

export type AttendanceStatusValue = AttendanceStatus;

export type AttendanceRecord = {
  id: string;
  organizationId: string;
  projectId: string;
  workerAssignmentId: string;
  workDate: string;
  status: AttendanceStatusValue;
  checkIn?: string | null;
  checkOut?: string | null;
  overtimeHours?: string | number | null;
  notes?: string | null;
  markedBy: string;
  markedAt: string;
  lastEditedBy?: string | null;
  lastEditedAt?: string | null;
  syncMetadata?: Record<string, unknown> | null;
  deletedAt?: string | null;
  deletedBy?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

export type AttendanceEntryInput = {
  workerAssignmentId: string;
  status: AttendanceStatusValue;
  checkIn?: string | null;
  checkOut?: string | null;
  notes?: string | null;
};

export type SaveAttendanceInput = {
  date: string;
  entries: AttendanceEntryInput[];
};

export type UpdateAttendanceInput = {
  status?: AttendanceStatusValue;
  checkIn?: string | null;
  checkOut?: string | null;
  notes?: string | null;
};

export type AttendanceListResponse = {
  data: AttendanceRecord[];
  meta: {
    total: number;
    date: string;
  };
};
