import type { ProjectProgressStage } from "@nirman-app/shared";
export type ProgressQuery = { stage?: ProjectProgressStage; dateFrom?: string; dateTo?: string; page?: number; pageSize?: number };
export type ProgressInput = { stage: ProjectProgressStage; percentage: number; updateDate: string; notes: string | null; expectedPreviousPercentage: number | null; idempotencyKey: string };
