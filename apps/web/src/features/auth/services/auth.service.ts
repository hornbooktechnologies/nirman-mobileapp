import { api } from "@/lib/api/api-client";
import type { AuthUser } from "@/providers/auth-provider";
import type {
  OrganizationOwnerInvitationAcceptance,
  OrganizationOwnerInvitationAcceptanceInput,
  OrganizationOwnerInvitationPreview,
} from "@nirman-app/shared";

interface LoginInput {
  email: string;
  password: string;
}

interface LoginResponse {
  accessToken: string;
  user: LoginUserResponse;
  activeOrganization: { id: string } | null;
  activeRole: ActiveRoleResponse | null;
  permissions: string[];
}

interface RefreshResponse {
  accessToken: string;
}

interface ProfileResponse {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  avatar: string | null;
  status: "ACTIVE" | "INACTIVE";
  role: { id: string; name: string };
  permissions: string[];
}

interface ActiveRoleResponse {
  id: string;
  key: string;
  name: string;
}

interface WorkspaceSessionResponse {
  user: {
    id: string;
    name: string;
    email: string | null;
    mobile: string | null;
    avatarUrl: string | null;
    status: "ACTIVE" | "INACTIVE";
  };
  activeOrganization: { id: string } | null;
  activeRole: ActiveRoleResponse | null;
  permissions: string[];
}

type LoginPermissionResponse = string | {
  resource: string;
  action: string;
};

type LoginUserResponse = Omit<AuthUser, "permissions"> & {
  permissions: LoginPermissionResponse[];
};

function normalizePermissions(permissions: LoginPermissionResponse[]) {
  return permissions.map((permission) =>
    typeof permission === "string"
      ? permission
      : `${permission.resource}:${permission.action}`,
  );
}

export function toAuthUser(profile: ProfileResponse | LoginUserResponse): AuthUser {
  return {
    id: profile.id,
    name: profile.name,
    email: profile.email,
    phone: profile.phone,
    avatar: profile.avatar,
    status: profile.status,
    roleId: "role" in profile ? profile.role.id : profile.roleId,
    roleName: "role" in profile ? profile.role.name : profile.roleName,
    permissions: normalizePermissions(profile.permissions),
  };
}

function toWorkspaceAuthUser(
  user: WorkspaceSessionResponse["user"] | LoginUserResponse,
  activeRole: ActiveRoleResponse | null,
  permissions: string[],
): AuthUser {
  const loginUser = "roleId" in user ? user : null;
  return {
    id: user.id,
    name: user.name,
    email: user.email ?? "",
    phone: "mobile" in user ? user.mobile : user.phone,
    avatar: "avatarUrl" in user ? user.avatarUrl : user.avatar,
    status: user.status,
    roleId: activeRole?.id ?? loginUser?.roleId ?? "",
    roleName: activeRole?.name ?? loginUser?.roleName ?? "Member",
    permissions: normalizePermissions(permissions),
  };
}

export const authService = {
  async login(input: LoginInput) {
    const response = await api.post<LoginResponse, LoginInput>("/auth/login", input);
    return {
      accessToken: response.accessToken,
      activeOrganizationId: response.activeOrganization?.id ?? null,
      user: toWorkspaceAuthUser(
        response.user,
        response.activeRole,
        response.permissions,
      ),
    };
  },
  refresh() {
    return api.post<RefreshResponse>("/auth/refresh");
  },
  logout() {
    return api.post<null>("/auth/logout");
  },
  async getProfile(organizationId?: string | null) {
    const query = organizationId
      ? `?organizationId=${encodeURIComponent(organizationId)}`
      : "";
    const session = await api.get<WorkspaceSessionResponse>(`/auth/session${query}`);
    return {
      activeOrganizationId: session.activeOrganization?.id ?? null,
      user: toWorkspaceAuthUser(
        session.user,
        session.activeRole,
        session.permissions,
      ),
    };
  },
  invitation(token: string) {
    return api.get<OrganizationOwnerInvitationPreview>(
      `/onboarding/invitations/${encodeURIComponent(token)}`,
    );
  },
  acceptInvitation(
    token: string,
    input: OrganizationOwnerInvitationAcceptanceInput = {},
  ) {
    return api.post<
      OrganizationOwnerInvitationAcceptance,
      OrganizationOwnerInvitationAcceptanceInput
    >(`/onboarding/invitations/${encodeURIComponent(token)}/accept`, input);
  },
};
