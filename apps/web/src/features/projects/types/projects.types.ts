import type {
  ProjectAccessScope,
  ProjectMemberStatus,
  ProjectStatus,
  ProjectType,
} from "@nirman-app/shared";

export interface ProjectAddress {
  line1: string | null;
  line2: string | null;
  city: string | null;
  state: string | null;
  postalCode: string | null;
  latitude: string | number | null;
  longitude: string | number | null;
}

export interface Project {
  id: string;
  organizationId: string;
  name: string;
  projectCode: string | null;
  type: ProjectType;
  address: ProjectAddress;
  status: ProjectStatus;
  startDate: string | null;
  expectedCompletionDate: string | null;
  description: string | null;
  coverFileId: string | null;
  memberCount: number;
  createdAt: string;
  updatedAt: string;
  archivedAt: string | null;
  currentUserAccess?: {
    scope: ProjectAccessScope;
    roleLabel: string | null;
    permissions: string[];
  };
}

export interface PaginatedProjects {
  data: Project[];
  meta: {
    total: number;
    page: number;
    pageSize: number;
    pageCount: number;
  };
}

export interface ProjectQuery {
  search?: string;
  status?: ProjectStatus | "";
  type?: ProjectType | "";
  page?: number;
  pageSize?: number;
}

export interface ProjectInput {
  name: string;
  projectCode?: string | null;
  type: ProjectType;
  address?: Partial<ProjectAddress>;
  startDate?: string | null;
  expectedCompletionDate?: string | null;
  description?: string | null;
  status?: ProjectStatus;
}

export interface ProjectMember {
  id: string;
  organizationId: string;
  projectId: string;
  memberId: string;
  user: {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
  };
  role: {
    id: string;
    name: string;
  };
  roleLabel: string | null;
  status: ProjectMemberStatus;
  startsOn: string | null;
  endsOn: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectMemberInput {
  roleLabel?: string | null;
  status?: ProjectMemberStatus;
  startsOn?: string | null;
  endsOn?: string | null;
}

export interface ProjectAccess {
  organizationId: string;
  projectScope: ProjectAccessScope;
  activeProjectId: string | null;
  projects: {
    id: string;
    name: string;
    projectCode: string | null;
    status: ProjectStatus;
    roleLabel: string | null;
    isDefault: boolean;
  }[];
}
