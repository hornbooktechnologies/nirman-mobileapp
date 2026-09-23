import type { PaginatedProjects } from "./types/projects.types";

export function normalizeProjectsResponse(
  response: PaginatedProjects | PaginatedProjects["data"] | null | undefined,
): PaginatedProjects {
  if (Array.isArray(response)) {
    return {
      paginationAvailable: false,
      data: response,
      meta: {
        total: response.length,
        page: 1,
        pageSize: response.length,
        pageCount: response.length > 0 ? 1 : 0,
      },
    };
  }

  if (!response) {
    return {
      paginationAvailable: false,
      data: [],
      meta: {
        total: 0,
        page: 1,
        pageSize: 0,
        pageCount: 0,
      },
    };
  }

  return {
    paginationAvailable:
      Array.isArray(response.data) &&
      Boolean(response.meta) &&
      Number.isInteger(response.meta?.page) &&
      response.meta.page >= 1 &&
      Number.isInteger(response.meta?.pageSize) &&
      response.meta.pageSize >= 1 &&
      Number.isInteger(response.meta?.total) &&
      response.meta.total >= 0 &&
      Number.isInteger(response.meta?.pageCount) &&
      response.meta.pageCount >= 0,
    data: Array.isArray(response.data) ? response.data : [],
    meta: response.meta ?? {
      total: Array.isArray(response.data) ? response.data.length : 0,
      page: 1,
      pageSize: Array.isArray(response.data) ? response.data.length : 0,
      pageCount:
        Array.isArray(response.data) && response.data.length > 0 ? 1 : 0,
    },
  };
}
