"use client";
import { useQuery } from "@tanstack/react-query";
import { progressKey } from "../progress-rules";
import { progressService } from "../services/progress.service";
import type { ProgressQuery } from "../types/progress.types";
export const useProgressSummary = (o: string, p: string) => useQuery({ queryKey: [...progressKey(o, p), "summary"], queryFn: ({ signal }) => progressService.summary(o, p, signal) });
export const useProgressHistory = (o: string, p: string, query: ProgressQuery, enabled: boolean) => useQuery({ queryKey: [...progressKey(o, p), "history", query], queryFn: ({ signal }) => progressService.history(o, p, query, signal), enabled });
export const useProgressPortfolio = (o: string) => useQuery({ queryKey: ["progress", o, "portfolio"], queryFn: ({ signal }) => progressService.portfolio(o, signal) });
