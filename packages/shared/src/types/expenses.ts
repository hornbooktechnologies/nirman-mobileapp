import type {
  ExpenseAvailableAction,
  ExpenseCategory,
  ExpenseEventType,
  ExpensePaymentMethod,
  ExpenseStatus,
  ExpenseWorkflowMode,
} from "../constants";

export type ExpenseEvent = {
  id: string;
  eventType: ExpenseEventType;
  previousStatus: ExpenseStatus | null;
  nextStatus: ExpenseStatus;
  comment: string | null;
  actorUserId: string;
  actorName: string;
  createdAt: string;
};

export type ExpenseAdjustment = {
  id: string;
  amount: string;
  reason: string;
  recordedByUserId: string;
  recordedBy: string;
  createdAt: string;
};

export type SiteExpense = {
  id: string;
  organizationId: string;
  projectId: string;
  expenseDate: string;
  category: ExpenseCategory;
  description: string;
  amount: string;
  adjustmentTotal: string;
  recognizedAmount: string;
  paymentMethod: ExpensePaymentMethod | null;
  vendorPayee: string | null;
  recordedByMemberId: string;
  recordedByUserId: string;
  recordedBy: string;
  workflowMode: ExpenseWorkflowMode;
  status: ExpenseStatus;
  approvedBy: string | null;
  approvedAt: string | null;
  rejectionReason: string | null;
  version: number;
  createdAt: string;
  updatedAt: string;
};

export type SiteExpenseDetail = SiteExpense & {
  availableActions: ExpenseAvailableAction[];
  events: ExpenseEvent[];
  adjustments: ExpenseAdjustment[];
};

export type SiteExpenseListResponse = {
  items: SiteExpense[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
};

export type SiteExpenseSummary = {
  approvedOriginalAmount: string;
  adjustmentTotal: string;
  recognizedAmount: string;
  pendingAmount: string;
  pendingCount: number;
  countsByStatus: Partial<Record<ExpenseStatus, number>>;
};
