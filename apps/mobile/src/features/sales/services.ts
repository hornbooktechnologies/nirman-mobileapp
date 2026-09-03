import type { BookingStatus, FollowUpStatus, FollowUpType, LeadStage, SiteVisitStatus, UnitStatus, UnitInterestStatus } from '@nirman-app/shared';

import { apiRequest } from '../../lib/api';
import type { LeadInput, SalesActivity, SalesBooking, SalesFollowUp, SalesLead, SalesPage, SalesSiteVisit, SalesUnit, SalesUnitInterest, UnitInput, UnitImportPreview, UnitImportResult } from './types';

type ApiEnvelope<TData> = { success: boolean; data: TData };
type PageEnvelope<TData> = ApiEnvelope<TData[]> & {
  meta: SalesPage<TData>['meta'];
};

function base(organizationId: string, projectId: string) {
  return `/organizations/${organizationId}/projects/${projectId}/sales`;
}

async function data<T>(path: string, accessToken: string, init: RequestInit = {}) {
  return (await apiRequest<ApiEnvelope<T>>(path, init, { accessToken })).data;
}

export async function fetchLeads(organizationId: string, projectId: string, accessToken: string, query: { search?: string; stage?: LeadStage; page?: number } = {}) {
  const params = new URLSearchParams({
    page: String(query.page ?? 1),
    limit: '50',
  });
  if (query.search) params.set('search', query.search);
  if (query.stage) params.set('stage', query.stage);
  const response = await apiRequest<PageEnvelope<SalesLead>>(`${base(organizationId, projectId)}/leads?${params}`, {}, { accessToken });
  return { data: response.data, meta: response.meta };
}

export const fetchLead = (o: string, p: string, leadId: string, token: string) => data<SalesLead>(`${base(o, p)}/leads/${leadId}`, token);
export const createLead = (o: string, p: string, token: string, input: LeadInput) =>
  data<SalesLead>(`${base(o, p)}/leads`, token, {
    method: 'POST',
    body: JSON.stringify(input),
  });
export const updateLead = (o: string, p: string, leadId: string, token: string, input: Partial<LeadInput> & { currentStage?: LeadStage; lostReason?: string }) =>
  data<SalesLead>(`${base(o, p)}/leads/${leadId}`, token, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
export const assignLead = (o: string, p: string, leadId: string, token: string, assignedTo: string) =>
  data<SalesLead>(`${base(o, p)}/leads/${leadId}/assignment`, token, {
    method: 'PUT',
    body: JSON.stringify({ assignedTo }),
  });
export const fetchActivities = (o: string, p: string, leadId: string, token: string) => data<SalesActivity[]>(`${base(o, p)}/leads/${leadId}/activities`, token);
export const addActivity = (
  o: string,
  p: string,
  leadId: string,
  token: string,
  input: {
    activityType: 'CALL_OUTCOME' | 'NOTE_ADDED' | 'BROCHURE_SHARED';
    summary: string;
    details?: string;
  },
) =>
  data<SalesActivity[]>(`${base(o, p)}/leads/${leadId}/activities`, token, {
    method: 'POST',
    body: JSON.stringify(input),
  });

export const fetchFollowUps = (o: string, p: string, token: string) => data<SalesFollowUp[]>(`${base(o, p)}/follow-ups`, token);
export const createFollowUp = (
  o: string,
  p: string,
  leadId: string,
  token: string,
  input: {
    assignedUserId?: string;
    scheduledAt: string;
    type: FollowUpType;
    notes?: string;
  },
) =>
  data<SalesFollowUp>(`${base(o, p)}/leads/${leadId}/follow-ups`, token, {
    method: 'POST',
    body: JSON.stringify(input),
  });
export const updateFollowUp = (
  o: string,
  p: string,
  leadId: string,
  followUpId: string,
  token: string,
  input: {
    status: FollowUpStatus;
    outcome?: string;
    notes?: string;
    nextFollowUpAt?: string;
  },
) => data<SalesFollowUp>(`${base(o, p)}/leads/${leadId}/follow-ups/${followUpId}`, token, { method: 'PATCH', body: JSON.stringify(input) });

export const fetchSiteVisits = (
  o: string,
  p: string,
  token: string,
  query: {
    status?: SiteVisitStatus;
    assignedSalesperson?: string;
    scheduledFrom?: string;
    scheduledTo?: string;
  } = {},
) => {
  const params = new URLSearchParams();
  if (query.status) params.set('status', query.status);
  if (query.assignedSalesperson) params.set('assignedSalesperson', query.assignedSalesperson);
  if (query.scheduledFrom) params.set('scheduledFrom', query.scheduledFrom);
  if (query.scheduledTo) params.set('scheduledTo', query.scheduledTo);
  const queryString = params.toString();
  const suffix = queryString ? `?${queryString}` : '';
  return data<SalesSiteVisit[]>(`${base(o, p)}/site-visits${suffix}`, token);
};
export const createSiteVisit = (
  o: string,
  p: string,
  leadId: string,
  token: string,
  input: {
    scheduledAt: string;
    assignedSalesperson?: string;
    attendeeCount?: number;
  },
) =>
  data<SalesSiteVisit>(`${base(o, p)}/leads/${leadId}/site-visits`, token, {
    method: 'POST',
    body: JSON.stringify(input),
  });
export const updateSiteVisit = (
  o: string,
  p: string,
  leadId: string,
  visitId: string,
  token: string,
  input: {
    status: SiteVisitStatus;
    scheduledAt?: string;
    attendeeCount?: number;
    customerFeedback?: string;
    objectionsConcerns?: string;
    nextAction?: string;
  },
) => data<SalesSiteVisit>(`${base(o, p)}/leads/${leadId}/site-visits/${visitId}`, token, { method: 'PATCH', body: JSON.stringify(input) });

export async function fetchUnits(o: string, p: string, token: string, query: { search?: string; status?: UnitStatus } = {}) {
  const params = new URLSearchParams();
  if (query.search) params.set('search', query.search);
  if (query.status) params.set('status', query.status);
  const queryString = params.toString();
  const suffix = queryString ? `?${queryString}` : '';
  return data<SalesUnit[]>(`${base(o, p)}/units${suffix}`, token);
}
export const createUnit = (o: string, p: string, token: string, input: UnitInput) =>
  data<SalesUnit>(`${base(o, p)}/units`, token, {
    method: 'POST',
    body: JSON.stringify(input),
  });
export const updateUnit = (o: string, p: string, unitId: string, token: string, input: UnitInput) =>
  data<SalesUnit>(`${base(o, p)}/units/${unitId}`, token, {
    method: 'PUT',
    body: JSON.stringify(input),
  });
export const previewUnitImport = (o: string, p: string, token: string, units: UnitInput[]) =>
  data<UnitImportPreview>(`${base(o, p)}/units/import/preview`, token, {
    method: 'POST',
    body: JSON.stringify({ units }),
  });
export const importUnits = (o: string, p: string, token: string, units: UnitInput[]) =>
  data<UnitImportResult>(`${base(o, p)}/units/import`, token, {
    method: 'POST',
    body: JSON.stringify({ units }),
  });
export const blockUnit = (o: string, p: string, unitId: string, token: string, input: { leadId: string; expiresAt?: string; notes?: string }) =>
  data<SalesUnit>(`${base(o, p)}/units/${unitId}/blocks`, token, {
    method: 'POST',
    body: JSON.stringify(input),
  });
export const releaseUnitBlock = (o: string, p: string, blockId: string, token: string) =>
  data<null>(`${base(o, p)}/unit-blocks/${blockId}/release`, token, {
    method: 'POST',
  });
export const fetchUnitInterests = (o: string, p: string, unitId: string, token: string) => data<SalesUnitInterest[]>(`${base(o, p)}/units/${unitId}/interests`, token);
export const fetchLeadUnitInterests = (o: string, p: string, leadId: string, token: string) => data<SalesUnitInterest[]>(`${base(o, p)}/leads/${leadId}/unit-interests`, token);
export const saveUnitInterest = (o: string, p: string, unitId: string, token: string, input: { leadId: string; status?: UnitInterestStatus; notes?: string }) =>
  data<SalesUnitInterest[]>(`${base(o, p)}/units/${unitId}/interests`, token, {
    method: 'POST',
    body: JSON.stringify(input),
  });
export const requestUnitHold = (o: string, p: string, unitId: string, token: string, input: { leadId: string; notes?: string }) => data<SalesUnitInterest[]>(`${base(o, p)}/units/${unitId}/hold-requests`, token, { method: 'POST', body: JSON.stringify(input) });
export const decideUnitHoldRequest = (
  o: string,
  p: string,
  requestId: string,
  token: string,
  input: {
    decision: 'APPROVED' | 'REJECTED';
    expiresAt?: string;
    notes?: string;
  },
) => data<SalesUnitInterest[]>(`${base(o, p)}/unit-hold-requests/${requestId}/decision`, token, { method: 'POST', body: JSON.stringify(input) });

export const fetchBookings = (
  o: string,
  p: string,
  token: string,
  query: {
    status?: BookingStatus;
    search?: string;
    bookedFrom?: string;
    bookedTo?: string;
  } = {},
) => {
  const params = new URLSearchParams();
  if (query.status) params.set('status', query.status);
  if (query.search) params.set('search', query.search);
  if (query.bookedFrom) params.set('bookedFrom', query.bookedFrom);
  if (query.bookedTo) params.set('bookedTo', query.bookedTo);
  const queryString = params.toString();
  return data<SalesBooking[]>(`${base(o, p)}/bookings${queryString ? `?${queryString}` : ''}`, token);
};
export const fetchBooking = (o: string, p: string, bookingId: string, token: string) => data<SalesBooking>(`${base(o, p)}/bookings/${bookingId}`, token);
export const createBooking = (
  o: string,
  p: string,
  token: string,
  input: {
    idempotencyKey: string;
    leadId: string;
    unitId?: string;
    bookingDate: string;
    bookingAmount?: number;
    bookingReference?: string;
  },
) =>
  data<SalesBooking>(`${base(o, p)}/bookings`, token, {
    method: 'POST',
    body: JSON.stringify(input),
  });
export const cancelBooking = (
  o: string,
  p: string,
  bookingId: string,
  token: string,
  input: {
    cancellationReason: string;
    restoredUnitStatus?: 'AVAILABLE' | 'UNAVAILABLE';
    restoredLeadStage: LeadStage;
  },
) =>
  data<SalesBooking>(`${base(o, p)}/bookings/${bookingId}/cancel`, token, {
    method: 'POST',
    body: JSON.stringify(input),
  });
