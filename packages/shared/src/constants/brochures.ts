export const BROCHURE_PROJECT_QUOTA_BYTES = 50 * 1024 * 1024;
export const BROCHURE_MAX_SELECTION = 50;

export const BROCHURE_ALLOWED_MIME_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "video/mp4",
  "video/quicktime",
] as const;

export const BROCHURE_CATEGORIES = [
  "COMPANY",
  "PROJECT",
  "HOUSE",
  "FLOOR_PLAN",
  "AMENITIES",
  "PRICE_LIST",
  "OTHER",
] as const;
export const BROCHURE_ASSET_STATUSES = [
  "ACTIVE",
  "ARCHIVED",
  "DELETED",
] as const;
export const BROCHURE_SHARE_CHANNELS = ["EMAIL", "OTHER"] as const;
export const BROCHURE_SHARE_STATUSES = [
  "ACTIVE",
  "REVOKED",
  "EXPIRED",
] as const;
export const BROCHURE_EMAIL_DELIVERY_STATUSES = [
  "NOT_APPLICABLE",
  "PENDING",
  "EMAIL_SENT",
  "EMAIL_FAILED",
  "MANUAL",
] as const;

export type BrochureMimeType = (typeof BROCHURE_ALLOWED_MIME_TYPES)[number];
export type BrochureCategory = (typeof BROCHURE_CATEGORIES)[number];
export type BrochureAssetStatus = (typeof BROCHURE_ASSET_STATUSES)[number];
export type BrochureShareChannel = (typeof BROCHURE_SHARE_CHANNELS)[number];
export type BrochureShareStatus = (typeof BROCHURE_SHARE_STATUSES)[number];
export type BrochureEmailDeliveryStatus =
  (typeof BROCHURE_EMAIL_DELIVERY_STATUSES)[number];
