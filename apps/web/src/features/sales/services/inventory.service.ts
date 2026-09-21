import { api } from "@/lib/api/api-client";
import type { UnitStatus } from "@nirman-app/shared";
import type {
  SalesUnit,
  SalesUnitInterest,
  UnitInput,
  UnitImportPreview,
  UnitImportResult,
} from "../types/inventory.types";
const id = encodeURIComponent;
const base = (o: string, p: string) =>
  `/organizations/${id(o)}/projects/${id(p)}/sales`;
export type UnitQuery = { search?: string; status?: UnitStatus };
export type InterestInput = {
  leadId: string;
  status?: "INTERESTED" | "HIGH_INTENT" | "WITHDRAWN";
  notes?: string;
};
export type HoldInput = { leadId: string; notes?: string; expiresAt?: string };
export type DecisionInput = {
  decision: "APPROVED" | "REJECTED";
  notes?: string;
  expiresAt?: string;
};
export const inventoryService = {
  units: (o: string, p: string, params: UnitQuery = {}, signal?: AbortSignal) =>
    api.get<SalesUnit[]>(`${base(o, p)}/units`, { params, signal }),
  create: (o: string, p: string, input: UnitInput) =>
    api.post<SalesUnit>(`${base(o, p)}/units`, input),
  update: (o: string, p: string, unit: string, input: UnitInput) =>
    api.put<SalesUnit>(`${base(o, p)}/units/${id(unit)}`, input),
  preview: (o: string, p: string, units: UnitInput[]) =>
    api.post<UnitImportPreview>(`${base(o, p)}/units/import/preview`, {
      units,
    }),
  import: (o: string, p: string, units: UnitInput[]) =>
    api.post<UnitImportResult>(`${base(o, p)}/units/import`, { units }),
  interests: (o: string, p: string, unit: string, signal?: AbortSignal) =>
    api.get<SalesUnitInterest[]>(`${base(o, p)}/units/${id(unit)}/interests`, {
      signal,
    }),
  leadInterests: (o: string, p: string, lead: string, signal?: AbortSignal) =>
    api.get<SalesUnitInterest[]>(
      `${base(o, p)}/leads/${id(lead)}/unit-interests`,
      { signal },
    ),
  interest: (o: string, p: string, unit: string, input: InterestInput) =>
    api.post<SalesUnitInterest[]>(
      `${base(o, p)}/units/${id(unit)}/interests`,
      input,
    ),
  request: (
    o: string,
    p: string,
    unit: string,
    input: Omit<HoldInput, "expiresAt">,
  ) =>
    api.post<SalesUnitInterest[]>(
      `${base(o, p)}/units/${id(unit)}/hold-requests`,
      input,
    ),
  decide: (o: string, p: string, request: string, input: DecisionInput) =>
    api.post<SalesUnitInterest[]>(
      `${base(o, p)}/unit-hold-requests/${id(request)}/decision`,
      input,
    ),
  block: (o: string, p: string, unit: string, input: HoldInput) =>
    api.post<SalesUnit>(`${base(o, p)}/units/${id(unit)}/blocks`, input),
  release: (o: string, p: string, block: string) =>
    api.post<null>(`${base(o, p)}/unit-blocks/${id(block)}/release`),
};
