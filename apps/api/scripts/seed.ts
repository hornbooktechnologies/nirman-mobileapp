import * as dotenv from 'dotenv';
import * as path from 'path';
import * as bcrypt from 'bcryptjs';
import { randomBytes, randomUUID } from 'node:crypto';
import {
  createPool,
  type PoolConnection,
  type RowDataPacket,
} from 'mysql2/promise';
import {
  DEFAULT_APP_NAME,
  PLATFORM_ADMIN_PERMISSIONS,
  PROJECT_PERMISSIONS,
  WORKER_PERMISSIONS,
  type PermissionKey,
} from '@nirman-app/shared';
import { parseMigrationDatabaseUrl } from '../src/database/migrations/migration-safety';

dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error('DATABASE_URL is not set. Copy .env.example to .env first.');
}

const parsedDatabaseUrl = parseMigrationDatabaseUrl(databaseUrl);
const seedDatabaseConfirmation = process.env.DB_SEED_CONFIRM;

if (seedDatabaseConfirmation !== parsedDatabaseUrl.database) {
  throw new Error(
    `Refusing to seed database ${parsedDatabaseUrl.database}. Set DB_SEED_CONFIRM=${parsedDatabaseUrl.database} to confirm the exact target.`,
  );
}

const shouldSeedRoleUsers = process.env.SEED_ROLE_USERS === 'true';

const pool = createPool({
  host: parsedDatabaseUrl.host,
  port: Number(parsedDatabaseUrl.port),
  user: parsedDatabaseUrl.username,
  password: parsedDatabaseUrl.password,
  database: parsedDatabaseUrl.database,
  waitForConnections: true,
  connectionLimit: Number(process.env.DB_CONNECTION_LIMIT ?? 5),
});

const DEFAULT_SETTINGS = [
  { key: 'general.appName', value: DEFAULT_APP_NAME },
  { key: 'general.companyName', value: '' },
  { key: 'general.lightLogo', value: '' },
  { key: 'general.darkLogo', value: '' },
  { key: 'general.favicon', value: '' },
  { key: 'general.supportEmail', value: '' },
  { key: 'general.supportPhone', value: '' },
  { key: 'general.companyAddress', value: '' },
  { key: 'email.smtpHost', value: '' },
  { key: 'email.smtpPort', value: '' },
  { key: 'email.smtpUsername', value: '' },
  { key: 'email.smtpPassword', value: '' },
  { key: 'email.smtpEncryption', value: '' },
  { key: 'email.mailFromAddress', value: '' },
  { key: 'email.mailFromName', value: '' },
];

const PLATFORM_SUPER_ADMIN_PERMISSIONS = [
  ...PLATFORM_ADMIN_PERMISSIONS,
] as const satisfies readonly PermissionKey[];

const ORGANIZATION_ADMIN_PERMISSIONS = [
  'organizations:read',
  'organizations:update',
  'members:read',
  'members:invite',
  'members:update',
  'members:deactivate',
  'roles:read',
  'roles:create',
  'roles:update',
  'roles:delete',
  'roles:manage',
  ...PROJECT_PERMISSIONS,
  'settings:read',
  'settings:update',
  'audit-logs:read',
  'notifications:read',
  'reports:read',
  ...WORKER_PERMISSIONS,
] as const satisfies readonly PermissionKey[];

const PROJECT_MANAGER_PERMISSIONS = [
  'organizations:read',
  'members:read',
  'projects:read',
  'projects:update',
  'projects:switch',
  'project-members:read',
  'workers:read',
] as const satisfies readonly PermissionKey[];

const CONTRACTOR_MEMBER_PERMISSIONS = [
  'organizations:read',
  'members:read',
  'projects:read',
  'projects:assign',
  'projects:switch',
  'project-members:read',
  'project-members:assign',
  'project-members:update',
  'project-members:unassign',
  ...WORKER_PERMISSIONS,
] as const satisfies readonly PermissionKey[];

const BUILDER_SUPERVISOR_PERMISSIONS = [
  'organizations:read',
  'members:read',
  'projects:read',
  'projects:switch',
  'project-members:read',
  'workers:read',
] as const satisfies readonly PermissionKey[];

const SITE_SUPERVISOR_PERMISSIONS = [
  'organizations:read',
  'members:read',
  'projects:read',
  'projects:switch',
  'project-members:read',
  'workers:read',
  'workers:create',
  'workers:update',
  'workers:assign-project',
] as const satisfies readonly PermissionKey[];

const SALES_USER_PERMISSIONS = [
  'organizations:read',
  'projects:read',
  'projects:switch',
] as const satisfies readonly PermissionKey[];

const VIEWER_PERMISSIONS = [
  ...SALES_USER_PERMISSIONS,
  'workers:read',
] as const satisfies readonly PermissionKey[];

const USER_MANAGER_COMPATIBILITY_PERMISSIONS = [
  'platform-users:create',
  'platform-users:read',
  'platform-users:update',
  'platform-users:deactivate',
  'platform-roles:read',
  'platform-settings:read',
] as const satisfies readonly PermissionKey[];

interface IdRow extends RowDataPacket {
  id: string;
}

interface RoleRow extends IdRow {
  name: string;
}

interface PermissionRow extends IdRow {
  resource: string;
  action: string;
}

interface RoleTemplate {
  name: string;
  legacyNames?: readonly string[];
  description: string;
  permissions: readonly PermissionKey[];
}

interface RoleUserSpec {
  roleName: string;
  name: string;
  emailLocalPart: string;
}

interface SeedCredential {
  role: string;
  email: string;
  password: string;
}

async function upsertRole(
  connection: PoolConnection,
  name: string,
  description: string,
  isSystem: boolean,
  legacyNames: readonly string[] = [],
) {
  const [existing] = await connection.execute<RoleRow[]>(
    'SELECT id, name FROM `role` WHERE name = ? LIMIT 1',
    [name],
  );

  let existingRole = existing[0];

  for (const legacyName of legacyNames) {
    if (existingRole) break;
    const [legacyRoles] = await connection.execute<RoleRow[]>(
      'SELECT id, name FROM `role` WHERE name = ? LIMIT 1',
      [legacyName],
    );
    existingRole = legacyRoles[0];
  }

  if (existingRole) {
    await connection.execute(
      'UPDATE `role` SET name = ?, description = ?, isSystem = ?, updatedAt = CURRENT_TIMESTAMP(3) WHERE id = ?',
      [name, description, isSystem, existingRole.id],
    );
    return existingRole.id;
  }

  const id = randomUUID();
  await connection.execute(
    'INSERT INTO `role` (id, name, description, isSystem, createdAt, updatedAt) VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3))',
    [id, name, description, isSystem],
  );
  return id;
}

function splitPermission(permission: PermissionKey) {
  const [resource, action] = permission.split(':');
  if (!resource || !action) {
    throw new Error(`Invalid permission key: ${permission}`);
  }
  return { resource, action };
}

async function upsertPermission(
  connection: PoolConnection,
  roleId: string,
  permission: PermissionKey,
) {
  const { resource, action } = splitPermission(permission);
  const [existing] = await connection.execute<IdRow[]>(
    'SELECT id FROM permission WHERE roleId = ? AND resource = ? AND action = ? LIMIT 1',
    [roleId, resource, action],
  );

  if (existing[0]) return;

  await connection.execute(
    'INSERT INTO permission (id, resource, action, roleId) VALUES (?, ?, ?, ?)',
    [randomUUID(), resource, action, roleId],
  );
}

async function syncRolePermissions(
  connection: PoolConnection,
  roleId: string,
  permissions: readonly PermissionKey[],
) {
  const allowed = new Set<string>(permissions);
  const [existing] = await connection.execute<PermissionRow[]>(
    'SELECT id, resource, action FROM permission WHERE roleId = ?',
    [roleId],
  );

  for (const permission of existing) {
    if (!allowed.has(`${permission.resource}:${permission.action}`)) {
      await connection.execute(
        'DELETE FROM permission WHERE id = ? AND roleId = ?',
        [permission.id, roleId],
      );
    }
  }

  for (const permission of permissions) {
    await upsertPermission(connection, roleId, permission);
  }
}

function generateSeedPassword() {
  return `${randomBytes(18).toString('base64url')}!Aa1`;
}

async function upsertSeedUser(
  connection: PoolConnection,
  name: string,
  email: string,
  password: string,
  roleId: string,
) {
  const hashedPassword = await bcrypt.hash(password, 12);
  const [existing] = await connection.execute<IdRow[]>(
    'SELECT id FROM `user` WHERE email = ? LIMIT 1',
    [email],
  );

  if (existing[0]) {
    await connection.execute(
      'UPDATE `user` SET name = ?, password = ?, isActive = ?, roleId = ?, updatedAt = CURRENT_TIMESTAMP(3) WHERE id = ?',
      [name, hashedPassword, true, roleId, existing[0].id],
    );
    return existing[0].id;
  }

  const id = randomUUID();
  await connection.execute(
    'INSERT INTO `user` (id, name, email, password, isActive, roleId, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3))',
    [id, name, email, hashedPassword, true, roleId],
  );
  return id;
}

async function upsertDemoOrganization(
  connection: PoolConnection,
  name: string,
  type: 'BUILDER' | 'CONTRACTOR',
  operatingProfile: string,
  actorId: string,
) {
  const [existing] = await connection.execute<IdRow[]>(
    'SELECT id FROM organizations WHERE name = ? AND type = ? LIMIT 1',
    [name, type],
  );

  if (existing[0]) {
    await connection.execute(
      "UPDATE organizations SET status = 'ACTIVE', operating_profile = ?, updated_by = ?, updated_at = CURRENT_TIMESTAMP(3) WHERE id = ?",
      [operatingProfile, actorId, existing[0].id],
    );
    return existing[0].id;
  }

  const id = randomUUID();
  await connection.execute(
    "INSERT INTO organizations (id, name, type, status, operating_profile, timezone, currency, created_by, updated_by, created_at, updated_at) VALUES (?, ?, ?, 'ACTIVE', ?, 'Asia/Kolkata', 'INR', ?, ?, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3))",
    [id, name, type, operatingProfile, actorId, actorId],
  );
  return id;
}

async function upsertDemoProject(
  connection: PoolConnection,
  organizationId: string,
  projectCode: string,
  name: string,
  type: 'RESIDENTIAL' | 'OTHER',
  actorId: string,
) {
  const [existing] = await connection.execute<IdRow[]>(
    'SELECT id FROM projects WHERE organization_id = ? AND project_code = ? LIMIT 1',
    [organizationId, projectCode],
  );

  if (existing[0]) {
    await connection.execute(
      "UPDATE projects SET name = ?, type = ?, status = 'ACTIVE', updated_by = ?, updated_at = CURRENT_TIMESTAMP(3) WHERE id = ?",
      [name, type, actorId, existing[0].id],
    );
    return existing[0].id;
  }

  const id = randomUUID();
  await connection.execute(
    "INSERT INTO projects (id, organization_id, name, project_code, type, status, created_by, updated_by, created_at, updated_at) VALUES (?, ?, ?, ?, ?, 'ACTIVE', ?, ?, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3))",
    [id, organizationId, name, projectCode, type, actorId, actorId],
  );
  return id;
}

async function upsertDemoMembership(
  connection: PoolConnection,
  organizationId: string,
  userId: string,
  roleId: string,
  organizationWideProjectAccess: boolean,
  actorId: string,
) {
  await connection.execute(
    "INSERT INTO organization_members (id, organization_id, user_id, role_id, status, organization_wide_project_access, joined_at, invited_by, created_by, updated_by, created_at, updated_at) VALUES (?, ?, ?, ?, 'ACTIVE', ?, CURRENT_TIMESTAMP(3), ?, ?, ?, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)) ON DUPLICATE KEY UPDATE role_id = VALUES(role_id), status = 'ACTIVE', organization_wide_project_access = VALUES(organization_wide_project_access), joined_at = COALESCE(joined_at, CURRENT_TIMESTAMP(3)), updated_by = VALUES(updated_by), updated_at = CURRENT_TIMESTAMP(3)",
    [
      randomUUID(),
      organizationId,
      userId,
      roleId,
      organizationWideProjectAccess,
      actorId,
      actorId,
      actorId,
    ],
  );

  const [memberships] = await connection.execute<IdRow[]>(
    'SELECT id FROM organization_members WHERE organization_id = ? AND user_id = ? LIMIT 1',
    [organizationId, userId],
  );
  if (!memberships[0])
    throw new Error('Organization membership was not seeded.');
  return memberships[0].id;
}

async function upsertDemoProjectMembership(
  connection: PoolConnection,
  organizationId: string,
  projectId: string,
  memberId: string,
  roleLabel: string,
  actorId: string,
) {
  await connection.execute(
    "INSERT INTO project_members (id, organization_id, project_id, member_id, role_label, status, starts_on, created_by, updated_by, created_at, updated_at) VALUES (?, ?, ?, ?, ?, 'ACTIVE', CURRENT_DATE, ?, ?, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)) ON DUPLICATE KEY UPDATE role_label = VALUES(role_label), status = 'ACTIVE', ends_on = NULL, ended_at = NULL, ended_by = NULL, updated_by = VALUES(updated_by), updated_at = CURRENT_TIMESTAMP(3)",
    [
      randomUUID(),
      organizationId,
      projectId,
      memberId,
      roleLabel,
      actorId,
      actorId,
    ],
  );
}

const ROLE_TEMPLATES: readonly RoleTemplate[] = [
  {
    name: 'Platform Super Admin',
    legacyNames: ['Super Admin'],
    description:
      'NirmanSite platform operator; no customer operational module permissions by default',
    permissions: PLATFORM_SUPER_ADMIN_PERMISSIONS,
  },
  {
    name: 'User Manager',
    description: 'Inherited global user-management compatibility role',
    permissions: USER_MANAGER_COMPATIBILITY_PERMISSIONS,
  },
  {
    name: 'Organization Owner',
    description:
      'Protected owner template for a Builder or Contractor organization',
    permissions: ORGANIZATION_ADMIN_PERMISSIONS,
  },
  {
    name: 'Builder Admin',
    description:
      'Organization administration and operations template for Builder customers',
    permissions: ORGANIZATION_ADMIN_PERMISSIONS,
  },
  {
    name: 'Independent Contractor Owner',
    description:
      'Owner and operations template for an independent Contractor organization',
    permissions: ORGANIZATION_ADMIN_PERMISSIONS,
  },
  {
    name: 'Project Manager',
    description:
      'Assigned-project oversight template with explicitly bounded operations',
    permissions: PROJECT_MANAGER_PERMISSIONS,
  },
  {
    name: 'Builder Supervisor',
    description:
      'Builder-side assigned-project oversight and verification foundation',
    permissions: BUILDER_SUPERVISOR_PERMISSIONS,
  },
  {
    name: 'Contractor Member',
    legacyNames: ['Contractor'],
    description:
      'Assigned-project operational Contractor ceiling, narrowed by Project grants',
    permissions: CONTRACTOR_MEMBER_PERMISSIONS,
  },
  {
    name: 'Site Supervisor',
    legacyNames: ['Supervisor'],
    description:
      'Assigned-project field template for daily worker roster maintenance',
    permissions: SITE_SUPERVISOR_PERMISSIONS,
  },
  {
    name: 'Sales User',
    description:
      'Assigned-project sales template with no Workers permissions by default',
    permissions: SALES_USER_PERMISSIONS,
  },
  {
    name: 'Viewer',
    description:
      'Read-only template constrained by organization membership and project access',
    permissions: VIEWER_PERMISSIONS,
  },
  {
    name: 'Member',
    description:
      'Inherited authenticated-member compatibility role with no default operations',
    permissions: [],
  },
];

const ROLE_USER_SPECS: readonly RoleUserSpec[] = [
  {
    roleName: 'Platform Super Admin',
    name: 'Platform Super Admin',
    emailLocalPart: 'platform.superadmin',
  },
  {
    roleName: 'User Manager',
    name: 'User Manager',
    emailLocalPart: 'user.manager',
  },
  {
    roleName: 'Organization Owner',
    name: 'Organization Owner',
    emailLocalPart: 'organization.owner',
  },
  {
    roleName: 'Builder Admin',
    name: 'Builder Admin',
    emailLocalPart: 'builder.admin',
  },
  {
    roleName: 'Independent Contractor Owner',
    name: 'Independent Contractor Owner',
    emailLocalPart: 'contractor.owner',
  },
  {
    roleName: 'Project Manager',
    name: 'Project Manager',
    emailLocalPart: 'project.manager',
  },
  {
    roleName: 'Contractor Member',
    name: 'Contractor Member',
    emailLocalPart: 'contractor.member',
  },
  {
    roleName: 'Site Supervisor',
    name: 'Site Supervisor',
    emailLocalPart: 'site.supervisor',
  },
  {
    roleName: 'Sales User',
    name: 'Sales User',
    emailLocalPart: 'sales.user',
  },
  {
    roleName: 'Viewer',
    name: 'Viewer',
    emailLocalPart: 'viewer',
  },
  {
    roleName: 'Member',
    name: 'Member',
    emailLocalPart: 'member',
  },
];

async function seedRoleUsersAndDemoAccess(
  connection: PoolConnection,
  roleIds: ReadonlyMap<string, string>,
) {
  const emailDomain =
    process.env.SEED_ROLE_USER_EMAIL_DOMAIN ?? 'nirmansite.test';
  const credentials: SeedCredential[] = [];
  const userIds = new Map<string, string>();

  for (const spec of ROLE_USER_SPECS) {
    const roleId = roleIds.get(spec.roleName);
    if (!roleId) throw new Error(`Missing seeded role: ${spec.roleName}`);
    const email = `${spec.emailLocalPart}@${emailDomain}`;
    const password = generateSeedPassword();
    const userId = await upsertSeedUser(
      connection,
      spec.name,
      email,
      password,
      roleId,
    );
    userIds.set(spec.roleName, userId);
    credentials.push({ role: spec.roleName, email, password });
  }

  const organizationOwnerId = userIds.get('Organization Owner');
  const contractorOwnerId = userIds.get('Independent Contractor Owner');
  if (!organizationOwnerId || !contractorOwnerId) {
    throw new Error('Demo organization owner users were not seeded.');
  }

  const builderOrganizationId = await upsertDemoOrganization(
    connection,
    'NirmanSite Demo Builder',
    'BUILDER',
    'SELF_MANAGED_BUILDER',
    organizationOwnerId,
  );
  const contractorOrganizationId = await upsertDemoOrganization(
    connection,
    'NirmanSite Demo Contractor',
    'CONTRACTOR',
    'INDEPENDENT_CONTRACTOR',
    contractorOwnerId,
  );
  const builderProjectId = await upsertDemoProject(
    connection,
    builderOrganizationId,
    'SEED-BUILDER',
    'Demo Builder Project',
    'RESIDENTIAL',
    organizationOwnerId,
  );
  await upsertDemoProject(
    connection,
    contractorOrganizationId,
    'SEED-CONTRACTOR',
    'Demo Contractor Project',
    'OTHER',
    contractorOwnerId,
  );

  const builderMemberships = [
    { roleName: 'Organization Owner', organizationWide: true },
    { roleName: 'Builder Admin', organizationWide: true },
    { roleName: 'Project Manager', organizationWide: false },
    { roleName: 'Contractor Member', organizationWide: false },
    { roleName: 'Site Supervisor', organizationWide: false },
    { roleName: 'Sales User', organizationWide: false },
    { roleName: 'Viewer', organizationWide: false },
    { roleName: 'Member', organizationWide: false },
  ] as const;

  for (const assignment of builderMemberships) {
    const userId = userIds.get(assignment.roleName);
    const roleId = roleIds.get(assignment.roleName);
    if (!userId || !roleId) {
      throw new Error(
        `Missing demo assignment identity: ${assignment.roleName}`,
      );
    }
    const memberId = await upsertDemoMembership(
      connection,
      builderOrganizationId,
      userId,
      roleId,
      assignment.organizationWide,
      organizationOwnerId,
    );
    if (!assignment.organizationWide) {
      await upsertDemoProjectMembership(
        connection,
        builderOrganizationId,
        builderProjectId,
        memberId,
        assignment.roleName,
        organizationOwnerId,
      );
    }
  }

  const contractorOwnerRoleId = roleIds.get('Independent Contractor Owner');
  if (!contractorOwnerRoleId) {
    throw new Error('Independent Contractor Owner role was not seeded.');
  }
  await upsertDemoMembership(
    connection,
    contractorOrganizationId,
    contractorOwnerId,
    contractorOwnerRoleId,
    true,
    contractorOwnerId,
  );

  return credentials;
}

async function main() {
  const connection = await pool.getConnection();
  let roleCredentials: SeedCredential[] = [];

  try {
    await connection.beginTransaction();

    const roleIds = new Map<string, string>();
    for (const template of ROLE_TEMPLATES) {
      const roleId = await upsertRole(
        connection,
        template.name,
        template.description,
        true,
        template.legacyNames,
      );
      await syncRolePermissions(connection, roleId, template.permissions);
      roleIds.set(template.name, roleId);
    }

    for (const setting of DEFAULT_SETTINGS) {
      await connection.execute(
        'INSERT INTO systemsetting (`key`, value, updatedAt) VALUES (?, ?, CURRENT_TIMESTAMP(3)) ON DUPLICATE KEY UPDATE `key` = `key`',
        [setting.key, setting.value],
      );
    }

    const adminEmail = process.env.SEED_ADMIN_EMAIL ?? 'admin@example.local';
    const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? 'ChangeMe123!';
    const hashedPassword = await bcrypt.hash(adminPassword, 12);
    const platformSuperAdminRoleId = roleIds.get('Platform Super Admin');

    if (!platformSuperAdminRoleId) {
      throw new Error('Platform Super Admin role was not seeded.');
    }

    const [existingAdmin] = await connection.execute<IdRow[]>(
      'SELECT id FROM `user` WHERE email = ? LIMIT 1',
      [adminEmail],
    );

    if (existingAdmin[0]) {
      await connection.execute(
        'UPDATE `user` SET name = ?, password = ?, isActive = ?, roleId = ?, updatedAt = CURRENT_TIMESTAMP(3) WHERE id = ?',
        [
          'System Administrator',
          hashedPassword,
          true,
          platformSuperAdminRoleId,
          existingAdmin[0].id,
        ],
      );
    } else {
      await connection.execute(
        'INSERT INTO `user` (id, name, email, password, isActive, roleId, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3))',
        [
          randomUUID(),
          'System Administrator',
          adminEmail,
          hashedPassword,
          true,
          platformSuperAdminRoleId,
        ],
      );
    }

    if (shouldSeedRoleUsers) {
      roleCredentials = await seedRoleUsersAndDemoAccess(connection, roleIds);
    }

    await connection.commit();
    console.log('Seeded platform and organization role templates with mysql2.');
    if (roleCredentials.length > 0) {
      console.log(
        'Seeded role-user credentials (passwords rotate on each SEED_ROLE_USERS=true run):',
      );
      for (const credential of roleCredentials) {
        console.log(
          `${credential.role}\t${credential.email}\t${credential.password}`,
        );
      }
    }
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
    await pool.end();
  }
}

void main().catch((error) => {
  console.error(error);
  process.exit(1);
});
