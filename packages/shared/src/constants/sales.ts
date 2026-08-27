export const LEAD_SOURCES = [
  "WEBSITE",
  "WALK_IN",
  "PHONE_CALL",
  "REFERRAL",
  "FACEBOOK",
  "INSTAGRAM",
  "GOOGLE_ADS",
  "PROPERTY_PORTAL",
  "BROKER",
  "EXISTING_CUSTOMER",
  "SALESPERSON_GENERATED",
  "OTHER",
] as const;

export type LeadSource = (typeof LEAD_SOURCES)[number];

export const LEAD_STAGES = [
  "NEW",
  "CONTACTED",
  "QUALIFIED",
  "SITE_VISIT_SCHEDULED",
  "SITE_VISIT_COMPLETED",
  "NEGOTIATION",
  "UNIT_BLOCKED",
  "BOOKED",
  "FOLLOW_UP_LATER",
  "NOT_INTERESTED",
  "LOST",
  "INVALID",
  "DUPLICATE",
] as const;

export type LeadStage = (typeof LEAD_STAGES)[number];

export const LEAD_PRIORITIES = ["LOW", "MEDIUM", "HIGH", "URGENT"] as const;
export type LeadPriority = (typeof LEAD_PRIORITIES)[number];

export const FOLLOW_UP_TYPES = [
  "PHONE",
  "WHATSAPP",
  "EMAIL",
  "SITE_VISIT",
  "OFFICE_MEETING",
  "VIDEO_CALL",
  "OTHER",
] as const;
export type FollowUpType = (typeof FOLLOW_UP_TYPES)[number];

export const FOLLOW_UP_STATUSES = [
  "SCHEDULED",
  "COMPLETED",
  "MISSED",
  "CANCELLED",
  "RESCHEDULED",
] as const;
export type FollowUpStatus = (typeof FOLLOW_UP_STATUSES)[number];

export const SITE_VISIT_STATUSES = [
  "SCHEDULED",
  "COMPLETED",
  "CANCELLED",
  "RESCHEDULED",
  "NO_SHOW",
] as const;
export type SiteVisitStatus = (typeof SITE_VISIT_STATUSES)[number];

export const UNIT_STATUSES = [
  "AVAILABLE",
  "BLOCKED",
  "BOOKED",
  "SOLD",
  "UNAVAILABLE",
] as const;
export type UnitStatus = (typeof UNIT_STATUSES)[number];

export const UNIT_BLOCK_STATUSES = [
  "ACTIVE",
  "EXPIRED",
  "RELEASED",
  "CONVERTED",
] as const;
export type UnitBlockStatus = (typeof UNIT_BLOCK_STATUSES)[number];

export const BOOKING_STATUSES = ["CONFIRMED", "CANCELLED"] as const;
export type BookingStatus = (typeof BOOKING_STATUSES)[number];

export const SALES_ACTIVITY_TYPES = [
  "LEAD_CREATED",
  "LEAD_ASSIGNED",
  "LEAD_REASSIGNED",
  "CALL_OUTCOME",
  "NOTE_ADDED",
  "BROCHURE_SHARED",
  "FOLLOW_UP_SCHEDULED",
  "FOLLOW_UP_COMPLETED",
  "SITE_VISIT_SCHEDULED",
  "SITE_VISIT_COMPLETED",
  "SITE_VISIT_CANCELLED",
  "SITE_VISIT_RESCHEDULED",
  "SITE_VISIT_NO_SHOW",
  "STAGE_CHANGED",
  "UNIT_SELECTED",
  "UNIT_BLOCKED",
  "UNIT_BLOCK_RELEASED",
  "LEAD_BOOKED",
  "LEAD_LOST",
  "BOOKING_CANCELLED",
] as const;
export type SalesActivityType = (typeof SALES_ACTIVITY_TYPES)[number];
