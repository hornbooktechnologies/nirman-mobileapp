import { api } from "@/lib/api/api-client";
import type {
  PaginatedProjects,
  Project,
  ProjectAccess,
  ProjectInput,
  ProjectMember,
  ProjectMemberInput,
  ProjectQuery,
  OrganizationProjectAssignment,
  OrganizationProjectAssignmentsOverview,
  SaveMemberProjectAssignmentsInput,
} from "@/features/projects/types/projects.types";

function queryString(query?: ProjectQuery) {
  const params = new URLSearchParams();
  Object.entries(query ?? {}).forEach(([key, value]) => {
    if (value !== undefined && value !== "") params.set(key, String(value));
  });
  const serialized = params.toString();
  return serialized ? `?${serialized}` : "";
}

function normalizeProjectsResponse(
  response: PaginatedProjects | PaginatedProjects["data"] | null | undefined,
): PaginatedProjects {
  if (Array.isArray(response)) {
    return {
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
    data: Array.isArray(response.data) ? response.data : [],
    meta: response.meta ?? {
      total: Array.isArray(response.data) ? response.data.length : 0,
      page: 1,
      pageSize: Array.isArray(response.data) ? response.data.length : 0,
      pageCount: Array.isArray(response.data) && response.data.length > 0 ? 1 : 0,
    },
  };
}

export const projectsService = {
  async projects(organizationId: string, query?: ProjectQuery) {
    const response = await api.get<PaginatedProjects | PaginatedProjects["data"]>(
      `/organizations/${organizationId}/projects${queryString(query)}`,
    );
    return normalizeProjectsResponse(response);
  },
  project(organizationId: string, projectId: string) {
    return api.get<Project>(`/organizations/${organizationId}/projects/${projectId}`);
  },
  createProject(organizationId: string, input: ProjectInput) {
    return api.post<Project, ProjectInput>(`/organizations/${organizationId}/projects`, input);
  },
  updateProject(organizationId: string, projectId: string, input: ProjectInput) {
    return api.patch<Project, ProjectInput>(
      `/organizations/${organizationId}/projects/${projectId}`,
      input,
    );
  },
  archiveProject(organizationId: string, projectId: string) {
    return api.post<Project>(`/organizations/${organizationId}/projects/${projectId}/archive`);
  },
  restoreProject(organizationId: string, projectId: string) {
    return api.post<Project>(`/organizations/${organizationId}/projects/${projectId}/restore`);
  },
  projectAccess(organizationId: string) {
    return api.get<ProjectAccess>(`/organizations/${organizationId}/project-access/me`);
  },
  members(organizationId: string, projectId: string) {
    return api.get<ProjectMember[]>(
      `/organizations/${organizationId}/projects/${projectId}/members`,
    );
  },
  organizationProjectAssignments(organizationId: string) {
    return api.get<OrganizationProjectAssignmentsOverview>(
      `/organizations/${organizationId}/project-member-assignments`,
    );
  },
  saveMemberProjectAssignments(
    organizationId: string,
    memberId: string,
    input: SaveMemberProjectAssignmentsInput,
  ) {
    return api.put<
      OrganizationProjectAssignment[],
      SaveMemberProjectAssignmentsInput
    >(
      `/organizations/${organizationId}/project-members/${memberId}/assignments`,
      input,
    );
  },
  assignMember(
    organizationId: string,
    projectId: string,
    memberId: string,
    input: ProjectMemberInput,
  ) {
    return api.put<ProjectMember, ProjectMemberInput>(
      `/organizations/${organizationId}/projects/${projectId}/members/${memberId}`,
      input,
    );
  },
  updateMember(
    organizationId: string,
    projectId: string,
    memberId: string,
    input: ProjectMemberInput,
  ) {
    return api.patch<ProjectMember, ProjectMemberInput>(
      `/organizations/${organizationId}/projects/${projectId}/members/${memberId}`,
      input,
    );
  },
  unassignMember(organizationId: string, projectId: string, memberId: string) {
    return api.delete<null>(
      `/organizations/${organizationId}/projects/${projectId}/members/${memberId}`,
    );
  },
};
