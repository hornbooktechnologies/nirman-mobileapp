import type {
  GalleryCategory,
  GalleryStatus,
  ProjectProgressStage,
} from "@nirman-app/shared";

export type GalleryQuery = {
  page?: number;
  pageSize?: number;
  category?: GalleryCategory;
  stage?: ProjectProgressStage;
  status?: GalleryStatus;
  dateFrom?: string;
  dateTo?: string;
};
export type QueuedGalleryUpload = {
  entryId: string;
  idempotencyKey: string;
  organizationId: string;
  projectId: string;
  uri: string;
  fileName: string;
  mimeType: string;
  width?: number;
  height?: number;
  category: GalleryCategory;
  stage?: ProjectProgressStage;
  caption?: string;
  capturedAt: string;
  state: "QUEUED" | "UPLOADING" | "FAILED";
  attempts: number;
  lastError?: string;
};
