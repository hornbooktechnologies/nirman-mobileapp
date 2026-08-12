import { api } from "@/lib/api/api-client";
import type {
  CreateOrganizationInput,
  InviteOrganizationMemberInput,
  Organization,
  OrganizationMemberInvitationResponse,
  OrganizationMemberRole,
  OrganizationOnboardingResponse,
  OrganizationMember,
  SwitchOrganizationResponse,
  UpdateOrganizationInput,
  UpdateOrganizationMemberInput,
} from "@/features/organizations/types/organizations.types";

export const organizationsService = {
  organizations() {
    return api.get<Organization[]>("/organizations");
  },
  organization(id: string) {
    return api.get<Organization>(`/organizations/${id}`);
  },
  createOrganization(input: CreateOrganizationInput) {
    return api.post<OrganizationOnboardingResponse, CreateOrganizationInput>(
      "/organizations",
      input,
    );
  },
  updateOrganization(id: string, input: UpdateOrganizationInput) {
    return api.patch<Organization, UpdateOrganizationInput>(
      `/organizations/${id}`,
      input,
    );
  },
  switchOrganization(id: string) {
    return api.post<SwitchOrganizationResponse>(`/organizations/${id}/switch`);
  },
  members(organizationId: string) {
    return api.get<OrganizationMember[]>(
      `/organizations/${organizationId}/members`,
    );
  },
  memberRoles(organizationId: string) {
    return api.get<OrganizationMemberRole[]>(
      `/organizations/${organizationId}/member-roles`,
    );
  },
  inviteMember(organizationId: string, input: InviteOrganizationMemberInput) {
    return api.post<
      OrganizationMemberInvitationResponse,
      InviteOrganizationMemberInput
    >(`/organizations/${organizationId}/invitations`, input);
  },
  updateMember(
    organizationId: string,
    memberId: string,
    input: UpdateOrganizationMemberInput,
  ) {
    return api.patch<OrganizationMember, UpdateOrganizationMemberInput>(
      `/organizations/${organizationId}/members/${memberId}`,
      input,
    );
  },
  deactivateMember(organizationId: string, memberId: string) {
    return api.post<OrganizationMember>(
      `/organizations/${organizationId}/members/${memberId}/deactivate`,
    );
  },
};
