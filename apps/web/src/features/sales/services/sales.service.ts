import { api, apiClient } from "@/lib/api/api-client";
import type {
  ActivityInput,
  FollowUpInput,
  FollowUpQuery,
  FollowUpUpdate,
  LeadInput,
  LeadPage,
  LeadQuery,
  LeadUpdate,
  SalesActivity,
  SalesFollowUp,
  SalesLead,
} from "../types/sales.types";
const base = (o: string, p: string) =>
  `/organizations/${encodeURIComponent(o)}/projects/${encodeURIComponent(p)}/sales`;
const id = encodeURIComponent;
export const salesService = {
  async leads(o: string, p: string, params: LeadQuery, signal?: AbortSignal) {
    // Preserve top-level pagination metadata; the generic API unwrap discards it.
    return (
      await apiClient.get<LeadPage>(`${base(o, p)}/leads`, { params, signal })
    ).data;
  },
  lead: (o: string, p: string, lead: string, signal?: AbortSignal) =>
    api.get<SalesLead>(`${base(o, p)}/leads/${id(lead)}`, { signal }),
  createLead: (o: string, p: string, input: LeadInput) =>
    api.post<SalesLead>(`${base(o, p)}/leads`, input),
  updateLead: (o: string, p: string, lead: string, input: LeadUpdate) =>
    api.patch<SalesLead>(`${base(o, p)}/leads/${id(lead)}`, input),
  assign: (o: string, p: string, lead: string, assignedTo: string) =>
    api.put<SalesLead>(`${base(o, p)}/leads/${id(lead)}/assignment`, {
      assignedTo,
    }),
  activities: (o: string, p: string, lead: string, signal?: AbortSignal) =>
    api.get<SalesActivity[]>(`${base(o, p)}/leads/${id(lead)}/activities`, {
      signal,
    }),
  addActivity: (o: string, p: string, lead: string, input: ActivityInput) =>
    api.post<SalesActivity[]>(
      `${base(o, p)}/leads/${id(lead)}/activities`,
      input,
    ),
  followUps: (
    o: string,
    p: string,
    params: FollowUpQuery = {},
    signal?: AbortSignal,
  ) => api.get<SalesFollowUp[]>(`${base(o, p)}/follow-ups`, { params, signal }),
  createFollowUp: (o: string, p: string, lead: string, input: FollowUpInput) =>
    api.post<SalesFollowUp>(
      `${base(o, p)}/leads/${id(lead)}/follow-ups`,
      input,
    ),
  updateFollowUp: (
    o: string,
    p: string,
    lead: string,
    followUp: string,
    input: FollowUpUpdate,
  ) =>
    api.patch<SalesFollowUp>(
      `${base(o, p)}/leads/${id(lead)}/follow-ups/${id(followUp)}`,
      input,
    ),
  units: (o: string, p: string, signal?: AbortSignal) =>
    api.get<{ id: string; unitNumber: string; status: string }[]>(
      `${base(o, p)}/units`,
      { signal },
    ),
};
