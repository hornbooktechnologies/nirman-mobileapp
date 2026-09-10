export const EXPENSE_WORKFLOW_MODES = ["DIRECT", "APPROVAL_REQUIRED"] as const;

export type ExpenseWorkflowMode = (typeof EXPENSE_WORKFLOW_MODES)[number];

export const EXPENSE_STATUSES = [
  "DRAFT",
  "PENDING_APPROVAL",
  "APPROVED",
  "REJECTED",
  "CANCELLED",
] as const;

export type ExpenseStatus = (typeof EXPENSE_STATUSES)[number];

export const EXPENSE_CATEGORIES = [
  "TRANSPORT",
  "TOOLS",
  "FOOD",
  "SAFETY",
  "ELECTRICAL",
  "MATERIAL_PURCHASE",
  "LABOUR_RELATED",
  "FUEL",
  "MISCELLANEOUS",
] as const;

export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];

export const EXPENSE_PAYMENT_METHODS = [
  "CASH",
  "UPI",
  "BANK_TRANSFER",
  "CARD",
  "CHEQUE",
  "OTHER",
] as const;

export type ExpensePaymentMethod = (typeof EXPENSE_PAYMENT_METHODS)[number];

export const EXPENSE_EVENT_TYPES = [
  "CREATED",
  "UPDATED",
  "SUBMITTED",
  "APPROVED",
  "REJECTED",
  "CANCELLED",
  "ADJUSTED",
] as const;

export type ExpenseEventType = (typeof EXPENSE_EVENT_TYPES)[number];

export const EXPENSE_AUDIT_ACTIONS = [
  "expenses.settings.updated",
  "expenses.expense.created",
  "expenses.expense.updated",
  "expenses.expense.submitted",
  "expenses.expense.approved",
  "expenses.expense.rejected",
  "expenses.expense.cancelled",
  "expenses.expense.adjusted",
] as const;

export type ExpenseAuditAction = (typeof EXPENSE_AUDIT_ACTIONS)[number];

export const EXPENSE_NOTIFICATION_TYPES = [
  "EXPENSE_APPROVAL_REQUIRED",
  "EXPENSE_APPROVED",
  "EXPENSE_REJECTED",
  "EXPENSE_ADJUSTED",
] as const;

export type ExpenseNotificationType =
  (typeof EXPENSE_NOTIFICATION_TYPES)[number];

export const EXPENSE_AVAILABLE_ACTIONS = [
  "EDIT",
  "SUBMIT",
  "APPROVE",
  "REJECT",
  "CANCEL",
  "ADJUST",
] as const;

export type ExpenseAvailableAction = (typeof EXPENSE_AVAILABLE_ACTIONS)[number];
