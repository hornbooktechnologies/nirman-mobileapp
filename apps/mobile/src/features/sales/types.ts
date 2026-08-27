import type {
  BookingStatus,
  FollowUpStatus,
  FollowUpType,
  LeadPriority,
  LeadSource,
  LeadStage,
  SalesActivityType,
  SiteVisitStatus,
  UnitStatus,
} from '@nirman-app/shared';

export type SalesLead = {
  id: string;
  organizationId: string;
  projectId: string;
  customerName: string;
  primaryMobile: string;
  alternateMobile: string | null;
  email: string | null;
  preferredUnitType: string | null;
  budgetMin: number | null;
  budgetMax: number | null;
  purchasePurpose: string | null;
  purchaseTimeline: string | null;
  source: LeadSource;
  sourceDetail: string | null;
  createdBy: string;
  createdByName: string | null;
  assignedTo: string | null;
  assignedToName: string | null;
  currentStage: LeadStage;
  priority: LeadPriority;
  interestedUnitId: string | null;
  interestedUnitNumber: string | null;
  lostReason: string | null;
  convertedAt: string | null;
  convertedBy: string | null;
  createdAt: string;
  updatedAt: string;
};

export type LeadInput = {
  customerName: string;
  primaryMobile: string;
  alternateMobile?: string;
  email?: string;
  preferredUnitType?: string;
  budgetMin?: number;
  budgetMax?: number;
  purchasePurpose?: string;
  purchaseTimeline?: string;
  source: LeadSource;
  sourceDetail?: string;
  assignedTo?: string;
  priority?: LeadPriority;
  interestedUnitId?: string;
};

export type SalesActivity = {
  id: string;
  activityType: SalesActivityType;
  summary: string;
  details: unknown;
  actorId: string;
  actorName: string | null;
  occurredAt: string;
};

export type SalesFollowUp = {
  id: string;
  leadId: string;
  assignedUserId: string;
  scheduledAt: string;
  type: FollowUpType;
  status: FollowUpStatus;
  outcome: string | null;
  notes: string | null;
  nextFollowUpAt: string | null;
  completedAt: string | null;
  customerName: string;
};

export type SalesSiteVisit = {
  id: string;
  leadId: string;
  scheduledAt: string;
  assignedSalesperson: string;
  attendeeCount: number | null;
  status: SiteVisitStatus;
  customerFeedback: string | null;
  objectionsConcerns: string | null;
  nextAction: string | null;
  completedAt: string | null;
  customerName: string;
};

export type SalesUnit = {
  id: string;
  unitNumber: string;
  unitType: string;
  wingTower: string | null;
  floor: string | null;
  areaSqft: number | null;
  facing: string | null;
  basePrice: number | null;
  status: UnitStatus;
  activeBlockId: string | null;
  blockedForLeadId: string | null;
  blockedBy: string | null;
  blockExpiresAt: string | null;
};

export type UnitInput = {
  unitNumber: string;
  unitType: string;
  wingTower?: string;
  floor?: string;
  areaSqft?: number;
  facing?: string;
  basePrice?: number;
  status?: UnitStatus;
};

export type SalesBooking = {
  id: string;
  leadId: string;
  unitId: string | null;
  bookedBy: string;
  bookingDate: string;
  customerName: string;
  customerMobile: string;
  bookingAmount: number | null;
  bookingReference: string | null;
  status: BookingStatus;
  cancellationReason: string | null;
  cancelledBy: string | null;
  cancelledAt: string | null;
  createdAt: string;
  unitNumber: string | null;
};

export type SalesPage<T> = {
  data: T[];
  meta: { page: number; limit: number; total: number };
};
