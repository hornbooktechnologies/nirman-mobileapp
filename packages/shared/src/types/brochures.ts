import type {
  BrochureAssetStatus,
  BrochureCategory,
  BrochureEmailDeliveryStatus,
  BrochureShareChannel,
  BrochureShareStatus,
} from "../constants/brochures";

export interface BrochureAsset {
  id: string;
  organizationId: string;
  projectId: string;
  title: string;
  description: string | null;
  category: BrochureCategory;
  status: BrochureAssetStatus;
  mimeType: string;
  byteSize: number;
  originalFilename: string;
  mediaPath: string;
  sortOrder: number;
  uploadedBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface BrochureQuota {
  usedBytes: number;
  limitBytes: number | null;
  remainingBytes: number | null;
  percentage: number | null;
}

export interface BrochureLibraryResponse {
  items: BrochureAsset[];
  quota: BrochureQuota;
}

export interface BrochureShare {
  id: string;
  organizationId: string;
  projectId: string;
  leadId: string | null;
  channel: BrochureShareChannel;
  recipientEmail: string | null;
  recipientName: string | null;
  status: BrochureShareStatus;
  emailDeliveryStatus: BrochureEmailDeliveryStatus;
  assetIds: string[];
  assetCount: number;
  shareUrl: string | null;
  expiresAt: string;
  createdAt: string;
}

export interface BrochureShareResult {
  share: BrochureShare;
  message: string;
}

export interface PublicBrochureAsset {
  id: string;
  title: string;
  description: string | null;
  category: BrochureCategory;
  mimeType: string;
  byteSize: number;
}

export interface PublicBrochureShareResponse {
  expiresAt: string;
  assets: PublicBrochureAsset[];
}

export interface LeadBrochureShareInput {
  assetIds: string[];
}
