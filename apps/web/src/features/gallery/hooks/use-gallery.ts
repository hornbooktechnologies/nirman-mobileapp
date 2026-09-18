import { useQuery } from "@tanstack/react-query";
import { galleryKey } from "../gallery-rules";
import { galleryService, type GalleryQuery } from "../services/gallery.service";
export const useGallery = (org: string, project: string, query: GalleryQuery, enabled = true) => useQuery({ queryKey: [...galleryKey(org, project), "entries", query], queryFn: ({ signal }) => galleryService.list(org, project, query, signal), enabled });
export const useGallerySummary = (org: string, project: string) => useQuery({ queryKey: [...galleryKey(org, project), "summary"], queryFn: ({ signal }) => galleryService.summary(org, project, signal) });
