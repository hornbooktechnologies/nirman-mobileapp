import AsyncStorage from "@react-native-async-storage/async-storage";
import * as FileSystem from "expo-file-system/legacy";
import type { ImagePickerAsset } from "expo-image-picker";
import type { GalleryCategory, ProjectProgressStage } from "@nirman-app/shared";
import type { QueuedGalleryUpload } from "./types";

const KEY = "nirman.gallery.upload-queue.v1";
const directory = `${FileSystem.documentDirectory}gallery-queue/`;
const makeId = () =>
  "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (value) => {
    const random = Math.floor(Math.random() * 16);
    return (value === "x" ? random : (random & 0x3) | 0x8).toString(16);
  });

export async function readGalleryQueue(): Promise<QueuedGalleryUpload[]> {
  const raw = await AsyncStorage.getItem(KEY);
  if (!raw) return [] as QueuedGalleryUpload[];
  try {
    return (JSON.parse(raw) as QueuedGalleryUpload[]).map<QueuedGalleryUpload>(
      (item) =>
        item.state === "UPLOADING"
          ? { ...item, state: "FAILED", lastError: item.lastError }
          : item,
    );
  } catch {
    return [];
  }
}
async function write(items: QueuedGalleryUpload[]) {
  await AsyncStorage.setItem(KEY, JSON.stringify(items));
  return items;
}
export async function enqueueGalleryUpload(input: {
  organizationId: string;
  projectId: string;
  asset: ImagePickerAsset;
  category: GalleryCategory;
  stage?: ProjectProgressStage;
  caption?: string;
}) {
  await FileSystem.makeDirectoryAsync(directory, { intermediates: true });
  const entryId = makeId();
  const extension =
    input.asset.mimeType === "image/png"
      ? "png"
      : input.asset.mimeType === "image/webp"
        ? "webp"
        : "jpg";
  const uri = `${directory}${entryId}.${extension}`;
  await FileSystem.copyAsync({ from: input.asset.uri, to: uri });
  const item: QueuedGalleryUpload = {
    entryId,
    idempotencyKey: `gallery-${entryId}`,
    organizationId: input.organizationId,
    projectId: input.projectId,
    uri,
    fileName: input.asset.fileName ?? `site-${entryId}.${extension}`,
    mimeType: input.asset.mimeType ?? "image/jpeg",
    width: input.asset.width,
    height: input.asset.height,
    category: input.category,
    stage: input.stage,
    caption: input.caption?.trim() || undefined,
    capturedAt: new Date().toISOString(),
    state: "QUEUED",
    attempts: 0,
  };
  return write([...(await readGalleryQueue()), item]).then(() => item);
}
export async function updateGalleryQueue(
  entryId: string,
  patch: Partial<QueuedGalleryUpload>,
) {
  return write(
    (await readGalleryQueue()).map((item) =>
      item.entryId === entryId ? { ...item, ...patch } : item,
    ),
  );
}
export async function removeGalleryQueue(entryId: string) {
  const items = await readGalleryQueue();
  const item = items.find((row) => row.entryId === entryId);
  await write(items.filter((row) => row.entryId !== entryId));
  if (item)
    await FileSystem.deleteAsync(item.uri, { idempotent: true }).catch(
      () => undefined,
    );
}
