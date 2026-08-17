import type {
  OperatingProfile,
  OrganizationMemberStatus,
  OrganizationStatus,
  OrganizationType,
  PermissionKey,
  ProjectAccessScope,
  ProjectStatus,
  ProjectPermissionMode,
  UserStatus,
} from '@nirman-app/shared';

import { deleteSecureValue, getSecureValue, setSecureValue } from '../storage';

const SESSION_STORAGE_KEY = 'nirmansite.mobile.session';
const ACTIVE_PROJECT_STORAGE_KEY = 'nirmansite.mobile.active-project-id';

export type MobileUser = {
  id: string;
  name: string;
  email: string | null;
  mobile: string | null;
  avatarUrl: string | null;
  status: UserStatus;
};

export type MobileOrganization = {
  id: string;
  name: string;
  type: OrganizationType;
  status: OrganizationStatus;
  branding: {
    logoUrl: string | null;
    primaryColor: string | null;
  };
  operatingProfile: OperatingProfile;
};

export type MobileMembership = {
  organizationId: string;
  memberId: string;
  organizationName: string;
  organizationType: OrganizationType;
  memberStatus: OrganizationMemberStatus;
  role: {
    id: string;
    key: string;
    name: string;
  };
  organizationWideProjectAccess: boolean;
};

export type MobileProjectSummary = {
  id: string;
  name: string;
  projectCode: string | null;
  status: ProjectStatus;
  roleLabel: string | null;
  permissionMode: ProjectPermissionMode;
  permissions: PermissionKey[];
  isDefault: boolean;
};

export type MobileProjectAccess = {
  organizationId: string | null;
  projectScope: ProjectAccessScope;
  activeProjectId: string | null;
  projects: MobileProjectSummary[];
};

export type MobileSessionPayload = {
  user: MobileUser;
  activeOrganization: MobileOrganization | null;
  memberships: MobileMembership[];
  permissions: PermissionKey[];
  projectAccess: MobileProjectAccess;
  featureFlags: Record<string, unknown>;
  serverTime: string;
};

export type MobileSession = {
  accessToken: string;
  expiresInSeconds: number | null;
  activeProjectId: string | null;
} & MobileSessionPayload;

type LoginResponseUser = MobileUser | {
  id: string;
  name: string;
  email: string | null;
  phone?: string | null;
  mobile?: string | null;
  avatar?: string | null;
  avatarUrl?: string | null;
  isActive?: boolean;
  status?: UserStatus;
};

export type LoginResponseData = Omit<MobileSessionPayload, 'user'> & {
  accessToken: string;
  expiresInSeconds?: number;
  user: LoginResponseUser;
};

export type SessionResponseData = MobileSessionPayload;

function normalizeProjectAccess(
  projectAccess?: MobileProjectAccess | null,
): MobileProjectAccess {
  return {
    organizationId: projectAccess?.organizationId ?? null,
    projectScope: projectAccess?.projectScope ?? 'NONE',
    activeProjectId: projectAccess?.activeProjectId ?? null,
    projects: Array.isArray(projectAccess?.projects) ? projectAccess.projects : [],
  };
}

export function createMobileSession(
  data: LoginResponseData,
  preferredProjectId?: string | null,
): MobileSession {
  const projectAccess = normalizeProjectAccess(data.projectAccess);
  const activeProjectId = resolveActiveProjectId(projectAccess, preferredProjectId);

  return {
    accessToken: data.accessToken,
    expiresInSeconds: data.expiresInSeconds ?? null,
    user: normalizeUser(data.user),
    activeOrganization: data.activeOrganization ?? null,
    memberships: data.memberships ?? [],
    permissions: data.permissions ?? [],
    projectAccess: {
      ...projectAccess,
      activeProjectId,
    },
    featureFlags: data.featureFlags ?? {},
    serverTime: data.serverTime ?? new Date().toISOString(),
    activeProjectId,
  };
}

export function mergeSessionPayload(
  currentSession: MobileSession,
  data: SessionResponseData,
  preferredProjectId?: string | null,
): MobileSession {
  const projectAccess = normalizeProjectAccess(data.projectAccess);
  const activeProjectId = resolveActiveProjectId(projectAccess, preferredProjectId ?? currentSession.activeProjectId);

  return {
    ...currentSession,
    user: data.user,
    activeOrganization: data.activeOrganization ?? null,
    memberships: data.memberships ?? [],
    permissions: data.permissions ?? [],
    projectAccess: {
      ...projectAccess,
      activeProjectId,
    },
    featureFlags: data.featureFlags ?? {},
    serverTime: data.serverTime ?? new Date().toISOString(),
    activeProjectId,
  };
}

export function resolveActiveProjectId(
  projectAccess: MobileProjectAccess | null | undefined,
  preferredProjectId?: string | null,
) {
  const normalizedProjectAccess = normalizeProjectAccess(projectAccess);
  const selectableProjects = normalizedProjectAccess.projects.filter(
    (project) =>
      project.status === 'ACTIVE' ||
      project.status === 'DRAFT' ||
      project.status === 'ON_HOLD',
  );

  if (
    preferredProjectId &&
    selectableProjects.some((project) => project.id === preferredProjectId)
  ) {
    return preferredProjectId;
  }

  if (
    normalizedProjectAccess.activeProjectId &&
    selectableProjects.some(
      (project) => project.id === normalizedProjectAccess.activeProjectId,
    )
  ) {
    return normalizedProjectAccess.activeProjectId;
  }

  const defaultProject = selectableProjects.find((project) => project.isDefault);
  if (defaultProject) return defaultProject.id;

  const activeProject = selectableProjects.find(
    (project) => project.status === 'ACTIVE',
  );
  if (activeProject) return activeProject.id;

  return selectableProjects.length === 1 ? selectableProjects[0].id : null;
}

export function getActiveProject(session: MobileSession | null) {
  if (!session?.activeProjectId) return null;
  return normalizeProjectAccess(session.projectAccess).projects.find((project) => project.id === session.activeProjectId) ?? null;
}

export function getActiveProjectPermissions(session: MobileSession | null) {
  const project = getActiveProject(session);
  return project?.permissions ?? session?.permissions ?? [];
}

export function normalizeStoredSession(session: MobileSession): MobileSession {
  const projectAccess = normalizeProjectAccess(session.projectAccess);
  const activeProjectId = resolveActiveProjectId(projectAccess, session.activeProjectId);

  return {
    ...session,
    activeOrganization: session.activeOrganization ?? null,
    memberships: session.memberships ?? [],
    permissions: session.permissions ?? [],
    projectAccess: {
      ...projectAccess,
      activeProjectId,
    },
    featureFlags: session.featureFlags ?? {},
    serverTime: session.serverTime ?? new Date().toISOString(),
    activeProjectId,
  };
}

function normalizeUser(user: LoginResponseUser): MobileUser {
  const isLegacyActive = 'isActive' in user ? user.isActive : undefined;
  const mobile = 'mobile' in user && user.mobile !== undefined ? user.mobile : null;
  const phone = 'phone' in user && user.phone !== undefined ? user.phone : null;
  const avatarUrl = 'avatarUrl' in user && user.avatarUrl !== undefined ? user.avatarUrl : null;
  const avatar = 'avatar' in user && user.avatar !== undefined ? user.avatar : null;

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    mobile: mobile ?? phone,
    avatarUrl: avatarUrl ?? avatar,
    status: user.status ?? (isLegacyActive === false ? 'INACTIVE' : 'ACTIVE'),
  };
}

export async function getStoredSession() {
  const rawSession = await getSecureValue(SESSION_STORAGE_KEY);

  if (!rawSession) {
    return null;
  }

  try {
    return normalizeStoredSession(JSON.parse(rawSession) as MobileSession);
  } catch {
    await clearStoredSession();
    return null;
  }
}

export function saveStoredSession(session: MobileSession) {
  return setSecureValue(SESSION_STORAGE_KEY, JSON.stringify(session));
}

export async function getStoredActiveProjectId() {
  return getSecureValue(ACTIVE_PROJECT_STORAGE_KEY);
}

export async function saveStoredActiveProjectId(projectId: string | null) {
  if (!projectId) {
    await deleteSecureValue(ACTIVE_PROJECT_STORAGE_KEY);
    return;
  }

  await setSecureValue(ACTIVE_PROJECT_STORAGE_KEY, projectId);
}

export async function clearStoredSession() {
  await deleteSecureValue(SESSION_STORAGE_KEY);
  await deleteSecureValue(ACTIVE_PROJECT_STORAGE_KEY);
}
