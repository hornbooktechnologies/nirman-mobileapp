import type {
  BookingStatus,
  LeadSource,
  LeadStage,
  UnitStatus,
} from "@nirman-app/shared";
export type SalesBooking = {
  id: string;
  organizationId: string;
  projectId: string;
  leadId: string;
  unitId: string | null;
  bookedBy: string;
  bookedByName: string | null;
  bookingDate: string;
  customerName: string;
  customerMobile: string;
  bookingAmount: number | null;
  bookingReference: string | null;
  leadSource: LeadSource;
  leadStageBeforeBooking: LeadStage | null;
  unitStatusBeforeBooking: UnitStatus | null;
  status: BookingStatus;
  cancellationReason: string | null;
  restoredLeadStage: LeadStage | null;
  restoredUnitStatus: UnitStatus | null;
  cancelledBy: string | null;
  cancelledByName: string | null;
  cancelledAt: string | null;
  createdAt: string;
  updatedAt: string;
  leadCurrentStage: LeadStage;
  convertedAt: string | null;
  convertedBy: string | null;
  convertedByName: string | null;
  unitNumber: string | null;
  unitType: string | null;
  unitCurrentStatus: UnitStatus | null;
};
export type BookingQuery = {
  search?: string;
  status?: BookingStatus;
  bookedFrom?: string;
  bookedTo?: string;
};
export type BookingInput = {
  idempotencyKey: string;
  leadId: string;
  unitId?: string;
  bookingDate: string;
  bookingAmount?: number;
  bookingReference?: string;
};
export type BookingCancellation = {
  cancellationReason: string;
  restoredLeadStage: LeadStage;
  restoredUnitStatus?: "AVAILABLE" | "UNAVAILABLE";
};
