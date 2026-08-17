import { apiRequest } from '../../lib/api';
import type {
  InviteOrganizationMemberInput,
  OrganizationMember,
  OrganizationMemberInvitationResponse,
  OrganizationMemberRole,
  OrganizationProjectAssignmentsOverview,
  ProjectMember,
  ProjectMemberInput,
  SaveMemberProjectAssignmentsInput,
  SubscriptionSummary,
  UpdateOrganizationMemberInput,
} from './types';

type ApiEnvelope<TData> = {
  success: boolean;
  data: TData;
};

async function requestData<TData>(
  path: string,
  accessToken: string,
  init: RequestInit = {},
) {
  const response = await apiRequest<ApiEnvelope<TData>>(path, init, { accessToken });
  return response.data;
}

export function fetchOrganizationMembers(organizationId: string, accessToken: string) {
  return requestData<OrganizationMember[]>(
    `/organizations/${organizationId}/members`,
    accessToken,
  );
}

export function fetchOrganizationMemberRoles(organizationId: string, accessToken: string) {
  return requestData<OrganizationMemberRole[]>(
    `/organizations/${organizationId}/member-roles`,
    accessToken,
  );
}

export function inviteOrganizationMember(
  organizationId: string,
  accessToken: string,
  input: InviteOrganizationMemberInput,
) {
  return requestData<OrganizationMemberInvitationResponse>(
    `/organizations/${organizationId}/invitations`,
    accessToken,
    { method: 'POST', body: JSON.stringify(input) },
  );
}

export function updateOrganizationMember(
  organizationId: string,
  memberId: string,
  accessToken: string,
  input: UpdateOrganizationMemberInput,
) {
  return requestData<OrganizationMember>(
    `/organizations/${organizationId}/members/${memberId}`,
    accessToken,
    { method: 'PATCH', body: JSON.stringify(input) },
  );
}

export function deactivateOrganizationMember(
  organizationId: string,
  memberId: string,
  accessToken: string,
) {
  return requestData<OrganizationMember>(
    `/organizations/${organizationId}/members/${memberId}/deactivate`,
    accessToken,
    { method: 'POST' },
  );
}

export function fetchOrganizationProjectAssignments(
  organizationId: string,
  accessToken: string,
) {
  return requestData<OrganizationProjectAssignmentsOverview>(
    `/organizations/${organizationId}/project-member-assignments`,
    accessToken,
  );
}

export function fetchOrganizationSubscriptionSummary(
  organizationId: string,
  accessToken: string,
) {
  return requestData<SubscriptionSummary>(
    `/organizations/${organizationId}/subscription-summary`,
    accessToken,
  );
}

export function saveMemberProjectAssignments(
  organizationId: string,
  memberId: string,
  accessToken: string,
  input: SaveMemberProjectAssignmentsInput,
) {
  return requestData<OrganizationProjectAssignmentsOverview['assignments']>(
    `/organizations/${organizationId}/project-members/${memberId}/assignments`,
    accessToken,
    { method: 'PUT', body: JSON.stringify(input) },
  );
}

export function fetchProjectMembers(
  organizationId: string,
  projectId: string,
  accessToken: string,
) {
  return requestData<ProjectMember[]>(
    `/organizations/${organizationId}/projects/${projectId}/members`,
    accessToken,
  );
}

export function assignProjectMember(
  organizationId: string,
  projectId: string,
  memberId: string,
  accessToken: string,
  input: ProjectMemberInput,
) {
  return requestData<ProjectMember>(
    `/organizations/${organizationId}/projects/${projectId}/members/${memberId}`,
    accessToken,
    { method: 'PUT', body: JSON.stringify(input) },
  );
}

export function updateProjectMember(
  organizationId: string,
  projectId: string,
  memberId: string,
  accessToken: string,
  input: ProjectMemberInput,
) {
  return requestData<ProjectMember>(
    `/organizations/${organizationId}/projects/${projectId}/members/${memberId}`,
    accessToken,
    { method: 'PATCH', body: JSON.stringify(input) },
  );
}

export function unassignProjectMember(
  organizationId: string,
  projectId: string,
  memberId: string,
  accessToken: string,
) {
  return requestData<null>(
    `/organizations/${organizationId}/projects/${projectId}/members/${memberId}`,
    accessToken,
    { method: 'DELETE' },
  );
}
