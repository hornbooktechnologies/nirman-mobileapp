export const GALLERY_CATEGORIES = [
  "PROGRESS",
  "WORK",
  "MATERIAL_DELIVERY",
  "SAFETY",
  "ISSUE",
  "OTHER",
] as const;

export const GALLERY_STATUSES = ["PENDING", "APPROVED", "REJECTED"] as const;
export const GALLERY_ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
export const GALLERY_MAX_FILE_BYTES = 10 * 1024 * 1024;
export const GALLERY_DIRECT_OPERATING_PROFILES = ["SELF_MANAGED_BUILDER", "INDEPENDENT_CONTRACTOR"] as const;

export type GalleryCategory = (typeof GALLERY_CATEGORIES)[number];
export type GalleryStatus = (typeof GALLERY_STATUSES)[number];
export type GalleryAllowedMimeType = (typeof GALLERY_ALLOWED_MIME_TYPES)[number];

export const GALLERY_AUDIT_ACTIONS = [
  "gallery.entry.uploaded",
  "gallery.entry.approved",
  "gallery.entry.rejected",
] as const;
