import type {
  AttendanceDuration,
  AttendanceExceptionType,
  AttendanceStatus,
  DerivedAttendanceState,
} from "../constants";

export type AttendanceException = {
  id: string;
  organizationId: string;
  projectId: string;
  workerAssignmentId: string;
  workDate: string;
  exceptionType: AttendanceExceptionType;
  duration: AttendanceDuration;
  reasonCode: string | null;
  notes: string | null;
  recordedBy: string;
  recordedAt: string;
  updatedBy: string;
  updatedAt: string;
};

export type CreateAttendanceExceptionInput = {
  workerAssignmentId: string;
  workDate: string;
  exceptionType: AttendanceExceptionType;
  duration: AttendanceDuration;
  reasonCode?: string | null;
  notes?: string | null;
};

export type UpdateAttendanceExceptionInput = {
  duration?: AttendanceDuration;
  reasonCode?: string | null;
  notes?: string | null;
};

export type AttendanceSummaryQuery = {
  startDate: string;
  endDate: string;
  selectedDate?: string;
  search?: string;
  exceptionsOnly?: boolean;
  page?: number;
  pageSize?: number;
};

export type AttendanceSummaryRow = {
  worker: {
    id: string;
    workerCode: string;
    name: string;
    trade: string;
  };
  workerAssignmentId: string;
  expectedWorkingDays: number;
  presentDays: number;
  absentDays: number;
  selectedDate?: {
    date: string;
    state: DerivedAttendanceState;
    exception: AttendanceException | null;
  };
};

export type AttendanceSummaryResponse = {
  organizationId: string;
  projectId: string;
  startDate: string;
  endDate: string;
  rows: AttendanceSummaryRow[];
  totals: {
    workers: number;
    expectedWorkingDays: number;
    presentDays: number;
    absentDays: number;
  };
  meta: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
};

export type WorkerAttendancePeriodResponse = {
  organizationId: string;
  projectId: string;
  workerId: string;
  startDate: string;
  endDate: string;
  totals: {
    expectedWorkingDays: number;
    presentDays: number;
    absentDays: number;
  };
  exceptions: AttendanceException[];
};

/** @deprecated Compatibility contract for Web/Mobile until Slices B/C migrate. */
export type AttendanceStatusValue = AttendanceStatus;

/** @deprecated Explicit attendance rows are legacy history. */
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

/** @deprecated Compatibility input translated to exception mutations where safe. */
export type AttendanceEntryInput = {
  workerAssignmentId: string;
  status: AttendanceStatusValue;
  checkIn?: string | null;
  checkOut?: string | null;
  notes?: string | null;
};

/** @deprecated Compatibility input translated to exception mutations where safe. */
export type SaveAttendanceInput = {
  date: string;
  entries: AttendanceEntryInput[];
};

/** @deprecated Compatibility input translated to exception mutations where safe. */
export type UpdateAttendanceInput = {
  status?: AttendanceStatusValue;
  checkIn?: string | null;
  checkOut?: string | null;
  notes?: string | null;
};

/** @deprecated Compatibility response derived for legacy clients. */
export type AttendanceListResponse = {
  data: AttendanceRecord[];
  meta: {
    total: number;
    date: string;
  };
};
