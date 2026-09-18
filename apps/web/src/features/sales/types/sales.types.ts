import type {
  FollowUpStatus,
  FollowUpType,
  LeadPriority,
  LeadSource,
  LeadStage,
  SalesActivityType,
} from "@nirman-app/shared";
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
export type LeadUpdate = Partial<Omit<LeadInput, "assignedTo">> & {
  currentStage?: LeadStage;
  lostReason?: string;
};
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
  updatedAt: string;
  createdAt: string;
};
export type FollowUpInput = {
  assignedUserId?: string;
  scheduledAt: string;
  type: FollowUpType;
  notes?: string;
};
export type FollowUpUpdate = {
  status: FollowUpStatus;
  outcome?: string;
  notes?: string;
  nextFollowUpAt?: string;
};
export type ActivityInput = {
  activityType: "CALL_OUTCOME" | "NOTE_ADDED" | "BROCHURE_SHARED";
  summary: string;
  details?: string;
};
export type LeadQuery = {
  search?: string;
  stage?: string;
  assignedTo?: string;
  page?: number;
  limit?: number;
};
export type FollowUpQuery = {
  status?: string;
  assignedTo?: string;
  from?: string;
  to?: string;
};
export type LeadPage = {
  data: SalesLead[];
  meta: { page: number; limit: number; total: number };
};
