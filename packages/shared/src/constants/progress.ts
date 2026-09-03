export const PROJECT_PROGRESS_STAGES = [
  "FOUNDATION",
  "PLINTH",
  "SLAB",
  "BRICKWORK",
  "PLASTERING",
  "ELECTRICAL",
  "PLUMBING",
  "FINISHING",
  "HANDOVER",
] as const;

export type ProjectProgressStage = (typeof PROJECT_PROGRESS_STAGES)[number];

export const PROJECT_PROGRESS_AUDIT_ACTIONS = [
  "progress.update.recorded",
] as const;

export type ProjectProgressAuditAction =
  (typeof PROJECT_PROGRESS_AUDIT_ACTIONS)[number];
