import type { ProjectProgressStage } from "../constants";

export type ProjectProgressUpdate = {
  id: string;
  organizationId: string;
  projectId: string;
  stage: ProjectProgressStage;
  percentage: number;
  previousPercentage: number | null;
  updateDate: string;
  notes: string | null;
  updatedByUserId: string;
  updatedByMemberId: string;
  updatedBy: string;
  createdAt: string;
};

export type ProjectProgressStageSummary = {
  stage: ProjectProgressStage;
  percentage: number;
  lastUpdate: ProjectProgressUpdate | null;
};

export type ProjectProgressSummary = {
  organizationId: string;
  projectId: string;
  overallPercentage: number;
  completedStages: number;
  updatedStages: number;
  stages: ProjectProgressStageSummary[];
  latestUpdate: ProjectProgressUpdate | null;
};

export type ProjectProgressHistoryResponse = {
  items: ProjectProgressUpdate[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
};

export type ProjectProgressPortfolioItem = {
  projectId: string;
  projectName: string;
  projectCode: string;
  overallPercentage: number;
  latestStage: ProjectProgressStage | null;
  latestPercentage: number | null;
  latestUpdateDate: string | null;
};
