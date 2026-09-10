import type {
  ExpenseCategory,
  ExpensePaymentMethod,
  ExpenseStatus,
  ExpenseWorkflowMode,
} from '@nirman-app/shared';

export type ExpensesQuery = {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: ExpenseStatus;
  category?: ExpenseCategory;
  paymentMethod?: ExpensePaymentMethod;
  recordedByMemberId?: string;
  expenseFrom?: string;
  expenseTo?: string;
  sortBy?: 'expenseDate' | 'amount' | 'updatedAt' | 'description';
  sortOrder?: 'asc' | 'desc';
};

export type ExpenseSettings = {
  id?: string;
  organizationId: string;
  projectId: string;
  workflowMode: ExpenseWorkflowMode | null;
  configured: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export type ExpenseInput = {
  expenseDate: string;
  category: ExpenseCategory;
  description: string;
  amount: number;
  paymentMethod?: ExpensePaymentMethod | null;
  vendorPayee?: string | null;
  saveAsDraft?: boolean;
  idempotencyKey: string;
};

export type UpdateExpenseInput = Omit<ExpenseInput, 'saveAsDraft'> & {
  expectedVersion: number;
};

export type ExpenseCommandInput = {
  expectedVersion: number;
  reason?: string | null;
  idempotencyKey: string;
};

export type ExpenseAdjustmentInput = {
  expectedVersion: number;
  amount: number;
  reason: string;
  idempotencyKey: string;
};

