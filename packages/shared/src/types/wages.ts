import type {
  WageBatchStatus,
  WagePaymentMethod,
  WagePaymentStatus,
} from "../constants";

export type WagePreviewItem = {
  workerAssignmentId: string;
  workerId: string;
  workerCode: string;
  workerName: string;
  trade: string;
  dailyRate: string | null;
  presentDays: number;
  halfDays: number;
  holidayDays: number;
  absentDays: number;
  grossAmount: string;
  kharchiDeduction: string;
  adjustmentAmount: string;
  netAmount: string;
  isReady: boolean;
  readinessIssue?: string | null;
};

export type WagePreview = {
  periodStart: string;
  periodEnd: string;
  items: WagePreviewItem[];
  totals: {
    grossAmount: string;
    kharchiDeduction: string;
    adjustmentAmount: string;
    netAmount: string;
  };
};

export type WageBatch = {
  id: string;
  organizationId: string;
  projectId: string;
  periodStart: string;
  periodEnd: string;
  status: WageBatchStatus;
  generatedBy: string;
  confirmedBy?: string | null;
  confirmedAt?: string | null;
  cancelledBy?: string | null;
  cancelledAt?: string | null;
  createdAt: string;
  updatedAt: string;
  totals: {
    grossAmount: string;
    kharchiDeduction: string;
    adjustmentAmount: string;
    netAmount: string;
    paidAmount: string;
  };
};

export type WageItem = {
  id: string;
  wageBatchId: string;
  workerAssignmentId: string;
  workerId: string;
  workerCode: string;
  workerName: string;
  trade: string;
  dailyRate: string;
  presentDays: number;
  halfDays: number;
  holidayDays: number;
  absentDays: number;
  grossAmount: string;
  kharchiDeduction: string;
  adjustmentAmount: string;
  netAmount: string;
  paidAmount: string;
  paymentStatus: WagePaymentStatus;
  notes?: string | null;
};

export type WagePayment = {
  id: string;
  wageItemId: string;
  amount: string;
  paymentDate: string;
  paymentMethod: WagePaymentMethod;
  reference?: string | null;
  recordedBy: string;
  recordedAt: string;
};

export type WageBatchDetail = WageBatch & {
  items: WageItem[];
  payments: WagePayment[];
};
