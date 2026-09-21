import type {
  UnitStatus,
  UnitPriceBasis,
  UnitInterestStatus,
  UnitHoldRequestStatus,
  LeadStage,
  LeadPriority,
} from "@nirman-app/shared";
export type SalesUnit = {
  id: string;
  unitNumber: string;
  unitType: string;
  wingTower: string | null;
  floor: string | null;
  areaSqft: number | null;
  facing: string | null;
  basePrice: number | null;
  priceBasis: UnitPriceBasis;
  ratePerSqft: number | null;
  status: UnitStatus;
  activeBlockId: string | null;
  blockedForLeadId: string | null;
  blockedBy: string | null;
  blockExpiresAt: string | null;
  interestCount: number;
  pendingHoldRequestCount: number;
};

export type SalesUnitInterest = {
  id: string;
  unitId: string;
  leadId: string;
  status: UnitInterestStatus;
  notes: string | null;
  customerName: string;
  primaryMobile: string;
  leadStage: LeadStage;
  leadPriority: LeadPriority;
  assignedTo: string | null;
  assignedToName: string | null;
  unitNumber: string;
  holdRequestId: string | null;
  holdRequestStatus: UnitHoldRequestStatus | null;
  holdRequestNotes: string | null;
  holdRequestedAt: string | null;
  lastActivityAt: string | null;
  nextFollowUpAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type UnitInput = {
  unitNumber: string;
  unitType: string;
  wingTower?: string;
  floor?: string;
  areaSqft?: number;
  facing?: string;
  basePrice?: number;
  priceBasis?: UnitPriceBasis;
  ratePerSqft?: number;
  status?: UnitStatus;
};

export type UnitImportPreviewRow = {
  rowNumber: number;
  unit: UnitInput;
  valid: boolean;
  errors: string[];
};

export type UnitImportPreview = {
  totalCount: number;
  validCount: number;
  invalidCount: number;
  rows: UnitImportPreviewRow[];
};

export type UnitImportResult = {
  importedCount: number;
  units: SalesUnit[];
};
