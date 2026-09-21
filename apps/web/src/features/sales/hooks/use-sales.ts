import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { salesKey } from "../sales-rules";
import { salesService } from "../services/sales.service";
import type {
  FollowUpQuery,
  LeadQuery,
  SiteVisitQuery,
} from "../types/sales.types";
export const useSiteVisits = (
  o: string,
  p: string,
  query: SiteVisitQuery,
  enabled = true,
) =>
  useQuery({
    queryKey: [...salesKey(o, p), "site-visits", query],
    queryFn: ({ signal }) => salesService.siteVisits(o, p, query, signal),
    enabled,
  });
export function useSalesLifetime() {
  const live = useRef(true);
  useEffect(() => {
    live.current = true;
    return () => {
      live.current = false;
    };
  }, []);
  return live;
}
export const useLeads = (o: string, p: string, query: LeadQuery) =>
  useQuery({
    queryKey: [...salesKey(o, p), "leads", query],
    queryFn: ({ signal }) => salesService.leads(o, p, query, signal),
  });
export const useLead = (o: string, p: string, lead: string) =>
  useQuery({
    queryKey: [...salesKey(o, p), "lead", lead],
    queryFn: ({ signal }) => salesService.lead(o, p, lead, signal),
  });
export const useActivities = (
  o: string,
  p: string,
  lead: string,
  enabled: boolean,
) =>
  useQuery({
    queryKey: [...salesKey(o, p), "activities", lead],
    queryFn: ({ signal }) => salesService.activities(o, p, lead, signal),
    enabled,
  });
export const useFollowUps = (
  o: string,
  p: string,
  query: FollowUpQuery,
  enabled = true,
) =>
  useQuery({
    queryKey: [...salesKey(o, p), "follow-ups", query],
    queryFn: ({ signal }) => salesService.followUps(o, p, query, signal),
    enabled,
  });
