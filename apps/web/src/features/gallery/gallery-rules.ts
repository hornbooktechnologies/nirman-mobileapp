import { GALLERY_ALLOWED_MIME_TYPES, GALLERY_MAX_FILE_BYTES } from "@nirman-app/shared";
export const galleryKey = (org: string, project: string) => ["gallery", org, project] as const;
export const galleryScope = (user?: string, org?: string | null, project?: string) => JSON.stringify([user, org, project]);
export function galleryProject<T extends { id: string; permissions: readonly string[] }>(projects: T[], id: string) {
  return projects.find(p => p.id === id && p.permissions.includes("gallery:read"));
}
export const canUpload = (permissions: readonly string[], active: boolean) => active && permissions.includes("gallery:upload");
export const canReview = (permissions: readonly string[], actor: string, entry: { status: string; uploadedByUserId: string }, action: "approve" | "reject") => entry.status === "PENDING" && entry.uploadedByUserId !== actor && permissions.includes(`gallery:${action}`);
export const label = (value: string) => value.toLowerCase().replaceAll("_", " ").replace(/^./, s => s.toUpperCase());
export function fileError(file: { type: string; size: number }) {
  if (!(GALLERY_ALLOWED_MIME_TYPES as readonly string[]).includes(file.type)) return "Choose a JPEG, PNG, or WebP image.";
  if (!file.size || file.size > GALLERY_MAX_FILE_BYTES) return "Choose a non-empty image no larger than 10 MiB.";
  return "";
}
export const sameScope = (a: { user: string; org: string; project: string }, b: { user: string; org: string; project: string }) => a.user === b.user && a.org === b.org && a.project === b.project;
export function recovered<T extends { state: string; lastError?: string }>(row: T): T {
  return row.state === "UPLOADING" ? { ...row, state: "FAILED", lastError: "Upload was interrupted. Retry safely with the original upload identity." } : row;
}
