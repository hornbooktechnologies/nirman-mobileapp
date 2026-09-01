import type { KharchiBalanceStatus, KharchiPaymentMethod } from "../constants";

export type KharchiAdjustment = {
  id: string;
  kharchiAdvanceId: string;
  amount: string;
  reason: string;
  recordedBy: string;
  recordedAt: string;
};

export type KharchiDeductionAllocation = {
  id: string;
  kharchiAdvanceId: string;
  wageItemId: string;
  wageBatchId: string;
  deductionAmount: string;
  deductedAt: string;
  recordedBy: string;
};

export type KharchiAdvance = {
  id: string;
  organizationId: string;
  projectId: string;
  workerAssignmentId: string;
  workerId: string;
  workerCode: string;
  workerName: string;
  trade: string;
  amount: string;
  adjustmentAmount: string;
  effectiveAmount: string;
  deductedAmount: string;
  outstandingAmount: string;
  status: KharchiBalanceStatus;
  requestDate: string;
  paymentMethod: KharchiPaymentMethod;
  paymentReference?: string | null;
  notes?: string | null;
  recordedBy: string;
  paidAt: string;
  createdAt: string;
};

export type KharchiAdvanceDetail = KharchiAdvance & {
  adjustments: KharchiAdjustment[];
  deductionAllocations: KharchiDeductionAllocation[];
};

export type KharchiListResponse = {
  items: KharchiAdvance[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
};

export type KharchiWorkerBalance = {
  workerId: string;
  workerCode: string;
  workerName: string;
  trade: string;
  effectiveAmount: string;
  deductedAmount: string;
  outstandingAmount: string;
};

export type KharchiSummary = {
  originalAmount: string;
  adjustmentAmount: string;
  effectiveAmount: string;
  deductedAmount: string;
  outstandingAmount: string;
  workers: KharchiWorkerBalance[];
};
