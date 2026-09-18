import type { GalleryCategory, ProjectProgressStage } from "@nirman-app/shared";
import { sameScope, recovered } from "./gallery-rules";
export type QueueScope = { user: string; org: string; project: string };
export type QueuedPhoto = QueueScope & { entryId: string; idempotencyKey: string; file: Blob; fileName: string; category: GalleryCategory; stage?: ProjectProgressStage; caption?: string; capturedAt: string; state: "QUEUED" | "UPLOADING" | "FAILED"; attempts: number; lastError?: string };
let epoch = 0;
function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("nirman-gallery-queue", 1);
    request.onupgradeneeded = () => request.result.createObjectStore("photos", { keyPath: "entryId" });
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(new Error("Browser storage is unavailable. Allow site storage and retry."));
  });
}
async function transaction<T>(mode: IDBTransactionMode, operation: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const started = epoch;
  const db = await open();
  if (started !== epoch) { db.close(); throw new Error("Session changed. Queue operation cancelled."); }
  return new Promise((resolve, reject) => {
    const tx = db.transaction("photos", mode);
    const request = operation(tx.objectStore("photos"));
    tx.oncomplete = () => { db.close(); resolve(request.result); };
    tx.onabort = tx.onerror = () => { db.close(); reject(new Error("Could not save the upload queue. Browser storage may be full or unavailable. Free space and retry.")); };
  });
}
export const readQueue = async (scope: QueueScope) => (await transaction("readonly", store => store.getAll()) as QueuedPhoto[]).filter(row => sameScope(row, scope)).map(recovered);
export const savePhoto = (row: QueuedPhoto) => transaction("readwrite", store => store.put(row));
export const removePhoto = (id: string) => transaction("readwrite", store => store.delete(id));
export const GALLERY_SIGNOUT_KEY = "nirman.gallery.signout";
export function clearGalleryQueue(broadcast = true) {
  epoch++;
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event("gallery-session-cleared"));
  if (broadcast) {
    try { window.localStorage.setItem(GALLERY_SIGNOUT_KEY, `${Date.now()}-${Math.random()}`); } catch { /* IndexedDB cleanup still proceeds when localStorage is unavailable. */ }
  }
  void transaction("readwrite", store => store.clear()).catch(() => {
    // Deleting the database is the fallback when a clear transaction fails.
    indexedDB.deleteDatabase("nirman-gallery-queue");
  });
}
