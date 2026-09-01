export type {
  KharchiAdvance,
  KharchiAdvanceDetail,
  KharchiAdjustment,
  KharchiBalanceStatus,
  KharchiDeductionAllocation,
  KharchiListResponse,
  KharchiPaymentMethod,
  KharchiSummary,
  ProjectWorkerRosterItem,
} from '@nirman-app/shared';

export type KharchiQuery = {
  page?: number;
  pageSize?: number;
  workerId?: string;
  workerAssignmentId?: string;
  startDate?: string;
  endDate?: string;
  status?: import('@nirman-app/shared').KharchiBalanceStatus;
  paymentMethod?: import('@nirman-app/shared').KharchiPaymentMethod;
  search?: string;
  sortBy?: 'requestDate' | 'createdAt' | 'workerName' | 'outstandingAmount';
  sortOrder?: 'asc' | 'desc';
};

export type CreateKharchiInput = {
  workerAssignmentId: string;
  amount: number;
  requestDate: string;
  paymentMethod: import('@nirman-app/shared').KharchiPaymentMethod;
  paymentReference?: string | null;
  notes?: string | null;
  idempotencyKey: string;
};

export type CreateKharchiAdjustmentInput = {
  amount: number;
  reason: string;
  idempotencyKey: string;
};
