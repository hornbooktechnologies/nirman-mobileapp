import type {
  MaterialEventType,
  MaterialRequestStatus,
  MaterialUnit,
  MaterialWorkflowMode,
} from "../constants";

export type MaterialRequestEvent = {
  id: string;
  eventType: MaterialEventType;
  previousStatus: MaterialRequestStatus | null;
  nextStatus: MaterialRequestStatus;
  comment: string | null;
  actorUserId: string;
  actorName: string;
  createdAt: string;
};

export type MaterialPurchase = {
  id: string;
  orderedQuantity: string;
  vendorName: string | null;
  orderReference: string | null;
  unitCost: string | null;
  totalCost: string | null;
  purchasedOn: string;
  notes: string | null;
  recordedBy: string;
  createdAt: string;
};

export type MaterialDelivery = {
  id: string;
  materialPurchaseId: string | null;
  deliveredQuantity: string;
  deliveredOn: string;
  deliveryReference: string | null;
  notes: string | null;
  recordedBy: string;
  createdAt: string;
};

export type MaterialRequest = {
  id: string;
  organizationId: string;
  projectId: string;
  materialName: string;
  category: string | null;
  requestedQuantity: string;
  unitOfMeasure: MaterialUnit;
  customUnitLabel: string | null;
  requestedOn: string;
  requiredByDate: string | null;
  estimatedCost: string | null;
  responsibleContractorMemberId: string | null;
  workflowMode: MaterialWorkflowMode;
  status: MaterialRequestStatus;
  notes: string | null;
  requestedByMemberId: string;
  requestedBy: string;
  version: number;
  orderedQuantity: string;
  deliveredQuantity: string;
  remainingQuantity: string;
  totalPurchaseCost: string;
  createdAt: string;
  updatedAt: string;
};

export type MaterialRequestDetail = MaterialRequest & {
  availableActions: string[];
  events: MaterialRequestEvent[];
  purchases: MaterialPurchase[];
  deliveries: MaterialDelivery[];
};

export type MaterialRequestListResponse = {
  items: MaterialRequest[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
};

export type MaterialSummary = {
  totalRequests: number;
  overdueRequests: number;
  estimatedCost: string;
  purchaseCost: string;
  countsByStatus: Partial<Record<MaterialRequestStatus, number>>;
};
