import type { ProjectStatus, ProjectType } from '@nirman-app/shared';

export type Project = {
  id: string;
  organizationId: string;
  name: string;
  projectCode: string | null;
  type: ProjectType;
  address: {
    line1: string | null;
    line2: string | null;
    city: string | null;
    state: string | null;
    postalCode: string | null;
  };
  status: ProjectStatus;
  startDate: string | null;
  expectedCompletionDate: string | null;
  description: string | null;
};

export type ProjectInput = {
  name: string;
  projectCode?: string | null;
  type: ProjectType;
  address?: Partial<Project['address']>;
  startDate?: string | null;
  expectedCompletionDate?: string | null;
  description?: string | null;
  status?: ProjectStatus;
};
