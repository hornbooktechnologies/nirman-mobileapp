export const MATERIAL_WORKFLOW_MODES = [
  "DIRECT",
  "FINAL_APPROVAL",
] as const;

export type MaterialWorkflowMode = (typeof MATERIAL_WORKFLOW_MODES)[number];
// Historical snapshots remain readable after verification is retired.
export type MaterialWorkflowSnapshot = MaterialWorkflowMode | "VERIFY_THEN_FINAL";

export const MATERIAL_REQUEST_STATUSES = [
  "DRAFT",
  "SUBMITTED",
  "PENDING_VERIFICATION",
  "PENDING_FINAL",
  "APPROVED",
  "RETURNED_FOR_CHANGES",
  "REJECTED",
  "ORDERED",
  "PARTIALLY_DELIVERED",
  "DELIVERED",
  "CANCELLED",
] as const;

export type MaterialRequestStatus = (typeof MATERIAL_REQUEST_STATUSES)[number];

export const MATERIAL_UNITS = [
  "BAG",
  "KG",
  "TONNE",
  "PIECE",
  "CUBIC_FOOT",
  "CUBIC_METER",
  "SQUARE_FOOT",
  "LITRE",
  "METER",
  "LOAD",
  "OTHER",
] as const;

export type MaterialUnit = (typeof MATERIAL_UNITS)[number];

export const MATERIAL_EVENT_TYPES = [
  "WORKFLOW_MIGRATED",
  "CREATED",
  "UPDATED",
  "SUBMITTED",
  "VERIFIED",
  "RETURNED",
  "APPROVED",
  "REJECTED",
  "CANCELLED",
  "PURCHASE_RECORDED",
  "DELIVERY_RECORDED",
  "COMPLETED",
] as const;

export type MaterialEventType = (typeof MATERIAL_EVENT_TYPES)[number];

export const MATERIAL_AUDIT_ACTIONS = [
  "materials.request.created",
  "materials.request.updated",
  "materials.request.submitted",
  "materials.request.verified",
  "materials.request.returned",
  "materials.request.approved",
  "materials.request.rejected",
  "materials.request.cancelled",
  "materials.purchase.recorded",
  "materials.delivery.recorded",
  "materials.request.completed",
  "materials.settings.updated",
] as const;

export type MaterialAuditAction = (typeof MATERIAL_AUDIT_ACTIONS)[number];

export const MATERIAL_NOTIFICATION_TYPES = [
  "MATERIAL_VERIFICATION_REQUIRED",
  "MATERIAL_FINAL_APPROVAL_REQUIRED",
  "MATERIAL_REQUEST_RETURNED",
  "MATERIAL_REQUEST_APPROVED",
  "MATERIAL_REQUEST_REJECTED",
  "MATERIAL_PURCHASE_RECORDED",
  "MATERIAL_DELIVERY_RECORDED",
] as const;

export type MaterialNotificationType =
  (typeof MATERIAL_NOTIFICATION_TYPES)[number];
