import type { GalleryCategory, GalleryStatus, ProjectProgressStage } from "../constants";

export type GalleryEntry = {
  id: string;
  organizationId: string;
  projectId: string;
  mediaPath: string;
  mimeType: string;
  byteSize: number;
  width: number | null;
  height: number | null;
  caption: string | null;
  category: GalleryCategory;
  stage: ProjectProgressStage | null;
  capturedAt: string;
  status: GalleryStatus;
  version: number;
  uploadedByUserId: string;
  uploadedByMemberId: string;
  uploadedBy: string;
  reviewedBy: string | null;
  reviewedAt: string | null;
  rejectionReason: string | null;
  createdAt: string;
};

export type GalleryListResponse = {
  items: GalleryEntry[];
  pagination: { page: number; pageSize: number; total: number; totalPages: number };
};

export type GallerySummary = {
  totalApproved: number;
  pendingReview: number;
  uploadedToday: number;
  latestApproved: GalleryEntry | null;
};
