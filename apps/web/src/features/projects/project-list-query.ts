import { PROJECT_STATUSES, PROJECT_TYPES } from "@nirman-app/shared";
import type { ProjectQuery } from "./types/projects.types";

export const defaultProjectFilters = { status: "", type: "" } as const;

export function readProjectListQuery(
  params: Pick<URLSearchParams, "get">,
  organizationId: string,
): Required<ProjectQuery> {
  const scope = params.get("organizationId");
  if (scope && scope !== organizationId)
    return { search: "", ...defaultProjectFilters, page: 1, pageSize: 20 };
  const rawPage = params.get("page") ?? "";
  return {
    search: params.get("search") ?? "",
    status:
      PROJECT_STATUSES.find((value) => value === params.get("status")) ?? "",
    type: PROJECT_TYPES.find((value) => value === params.get("type")) ?? "",
    page: /^[1-9]\d{0,5}$/.test(rawPage) ? Number(rawPage) : 1,
    pageSize: 20,
  };
}

export function projectListHref(
  organizationId: string,
  query: ProjectQuery,
): string {
  const params = new URLSearchParams({ organizationId });
  if (query.search) params.set("search", query.search);
  if (query.status) params.set("status", query.status);
  if (query.type) params.set("type", query.type);
  if (query.page && query.page > 1) params.set("page", String(query.page));
  return `/projects?${params}`;
}

export function projectListReturnHref(
  returnTo: string | null,
  organizationId: string,
): string {
  // Only reconstruct a known internal destination; never navigate a supplied URL.
  if (!returnTo?.startsWith("/projects?")) return "/projects";
  const params = new URLSearchParams(returnTo.slice("/projects?".length));
  if (params.get("organizationId") !== organizationId) return "/projects";
  return projectListHref(
    organizationId,
    readProjectListQuery(params, organizationId),
  );
}
