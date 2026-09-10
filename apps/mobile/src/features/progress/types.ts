import type { ProjectProgressStage } from '@nirman-app/shared';

export type ProgressHistoryQuery = {
  page?: number;
  pageSize?: number;
  stage?: ProjectProgressStage;
  dateFrom?: string;
  dateTo?: string;
};

export type RecordProgressInput = {
  stage: ProjectProgressStage;
  percentage: number;
  updateDate: string;
  notes?: string | null;
  expectedPreviousPercentage: number | null;
  idempotencyKey: string;
};
