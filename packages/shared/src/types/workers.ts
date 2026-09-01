import type {
  WorkerAssignmentStatus,
  WorkerSortKey,
  WorkerStatus,
} from "../constants";

export type WorkerDuplicateCandidate = {
  id: string;
  workerCode: string;
  name: string;
  trade: string;
  mobileNumber: string | null;
  status: WorkerStatus;
  reason: "MOBILE" | "NAME";
};

export type WorkerProjectAssignmentSummary = {
  id: string;
  organizationId: string;
  projectId: string;
  workerId: string;
  projectName?: string | null;
  roleLabel: string | null;
  dailyRate: string | null;
  status: WorkerAssignmentStatus;
  startsOn: string;
  endsOn: string | null;
  createdAt: string;
  updatedAt: string;
  endedAt: string | null;
};

export type WorkerPrimaryProjectPeriod = {
  id: string;
  organizationId: string;
  workerId: string;
  workerAssignmentId: string;
  projectId: string;
  projectName?: string | null;
  startsOn: string;
  endsOn: string | null;
  createdBy: string;
  updatedBy: string;
  createdAt: string;
  updatedAt: string;
  endedBy: string | null;
  endedAt: string | null;
};

export type CreateWorkerPrimaryProjectPeriodInput = {
  workerAssignmentId: string;
  startsOn: string;
  endsOn?: string | null;
};

export type UpdateWorkerPrimaryProjectPeriodInput = {
  workerAssignmentId?: string;
  startsOn?: string;
  endsOn?: string | null;
};

export type EndWorkerPrimaryProjectPeriodInput = {
  endsOn: string;
};

export type WorkerSummary = {
  id: string;
  organizationId: string;
  workerCode: string;
  name: string;
  trade: string;
  baseDailyRate: string | null;
  mobileNumber: string | null;
  notes: string | null;
  status: WorkerStatus;
  activeAssignmentCount: number;
  currentAssignment?: WorkerProjectAssignmentSummary | null;
  createdAt: string;
  updatedAt: string;
  deactivatedAt: string | null;
};

export type WorkerDetail = WorkerSummary & {
  assignments: WorkerProjectAssignmentSummary[];
  duplicateWarnings?: WorkerDuplicateCandidate[];
};

export type ProjectWorkerRosterItem = WorkerSummary & {
  currentAssignment: WorkerProjectAssignmentSummary;
};

export type WorkerListResponse = {
  data: WorkerSummary[];
  meta: {
    total: number;
    page: number;
    pageSize: number;
    pageCount: number;
  };
};

export type ProjectWorkerRosterResponse = {
  data: ProjectWorkerRosterItem[];
  meta: {
    total: number;
    page: number;
    pageSize: number;
    pageCount: number;
  };
};

export type WorkerListFilter = {
  search?: string;
  status?: WorkerStatus | "";
  trade?: string;
  projectId?: string;
  assignmentScope?: "CURRENT" | "ALL_ACTIVE";
  page?: number;
  pageSize?: number;
  sortBy?: WorkerSortKey;
  sortOrder?: "asc" | "desc";
};

export type CreateWorkerInput = {
  name: string;
  trade: string;
  mobileNumber?: string | null;
  notes?: string | null;
  projectId?: string | null;
  dailyRate?: string | number | null;
  startsOn?: string | null;
  acknowledgeDuplicateWarning?: boolean;
};

export type UpdateWorkerInput = {
  name?: string;
  trade?: string;
  dailyRate?: string | number | null;
  mobileNumber?: string | null;
  notes?: string | null;
  acknowledgeDuplicateWarning?: boolean;
};

export type AssignWorkerToProjectInput = {
  startsOn?: string | null;
  endsOn?: string | null;
};

export type UpdateWorkerProjectAssignmentInput = {
  startsOn?: string | null;
  endsOn?: string | null;
};

export type UpdateWorkerAssignmentRateInput = {
  dailyRate: string | number;
  effectiveDate: string;
  reason?: string | null;
};

export type DeactivateWorkerInput = {
  reason?: string | null;
};

export type WorkerDeletionResult = {
  workerId: string;
  workerCode: string;
  workerName: string;
  deleted: true;
  deletedRecords: {
    kharchiDeductionAllocations: number;
    kharchiAdjustments: number;
    kharchiAdvances: number;
    wagePayments: number;
    wageItems: number;
    emptyWageBatches: number;
    attendanceExceptions: number;
    attendanceRecords: number;
    primaryProjectPeriods: number;
    projectAssignments: number;
  };
};

export type EndWorkerProjectAssignmentInput = {
  endsOn: string;
  reason?: string | null;
};
