export type {
  MaterialDelivery,
  MaterialPurchase,
  MaterialRequest,
  MaterialRequestDetail,
  MaterialRequestEvent,
  MaterialRequestListResponse,
  MaterialSummary,
} from '@nirman-app/shared';

import type { MaterialRequestStatus, MaterialUnit, MaterialWorkflowMode } from '@nirman-app/shared';

export type MaterialsQuery = {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: MaterialRequestStatus;
  requestedByMemberId?: string;
  responsibleContractorMemberId?: string;
  requiredFrom?: string;
  requiredTo?: string;
  sortBy?: 'requestedOn' | 'requiredByDate' | 'updatedAt' | 'materialName';
  sortOrder?: 'asc' | 'desc';
};

export type MaterialSettings = {
  id?: string;
  organizationId: string;
  projectId: string;
  workflowMode: MaterialWorkflowMode | null;
  configured: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export type MaterialRequestInput = {
  materialName: string;
  category?: string | null;
  requestedQuantity: number;
  unitOfMeasure: MaterialUnit;
  customUnitLabel?: string | null;
  requestedOn: string;
  requiredByDate?: string | null;
  estimatedCost?: number | null;
  responsibleContractorMemberId?: string | null;
  notes?: string | null;
  idempotencyKey: string;
};

export type UpdateMaterialRequestInput = Partial<Omit<MaterialRequestInput, 'idempotencyKey'>> & {
  expectedVersion: number;
  idempotencyKey: string;
};

export type MaterialCommandInput = {
  expectedVersion: number;
  comment?: string | null;
  idempotencyKey: string;
};

export type MaterialPurchaseInput = MaterialCommandInput & {
  orderedQuantity: number;
  vendorName?: string | null;
  orderReference?: string | null;
  unitCost?: number | null;
  totalCost?: number | null;
  purchasedOn: string;
  notes?: string | null;
};

export type MaterialDeliveryInput = MaterialCommandInput & {
  materialPurchaseId?: string | null;
  deliveredQuantity: number;
  deliveredOn: string;
  deliveryReference?: string | null;
  notes?: string | null;
};

export type MaterialAction = 'EDIT' | 'SUBMIT' | 'VERIFY' | 'RETURN' | 'APPROVE' | 'REJECT' | 'CANCEL' | 'RECORD_PURCHASE' | 'RECORD_DELIVERY';
