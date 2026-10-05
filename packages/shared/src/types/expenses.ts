import type { PaymentLedger } from './total-expenses';
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

export type SiteExpenseDetail = SiteExpense & PaymentLedger & {
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

// Merge immutable source records without duplicating adjustment workflow events.
export function siteExpenseTimeline(detail: Pick<SiteExpenseDetail, "events" | "adjustments"> & Partial<PaymentLedger>) {
  const adjustments = detail.adjustments ?? [];
  return [
    ...(detail.events ?? []).filter(event => event.eventType !== "ADJUSTED" || adjustments.length === 0).map(event => ({
      id: `event:${event.id}`, eventType: event.eventType,
      amount: null as string | null, comment: event.comment, actorName: event.actorName, createdAt: event.createdAt,
    })),
    ...adjustments.map(a => ({ id: `adjustment:${a.id}`, eventType: "ADJUSTED" as const, amount: a.amount, comment: a.reason, actorName: a.recordedBy, createdAt: a.createdAt })),
    ...(detail.payments ?? []).flatMap(p => [
      { id: `payment:${p.id}`, eventType: "PAYMENT_RECORDED" as const, amount: p.amount, comment: [p.paymentMethod, p.paymentDate, p.reference].filter(Boolean).join(" · "), actorName: p.recordedBy, createdAt: p.recordedAt },
      ...(p.voidedAt ? [{ id: `void:${p.id}`, eventType: "PAYMENT_VOIDED" as const, amount: p.amount, comment: p.voidReason, actorName: p.voidedBy ?? "", createdAt: p.voidedAt }] : []),
    ]),
  ].sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
}
