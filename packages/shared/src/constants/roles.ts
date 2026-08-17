import type { OrganizationType } from "./statuses";

export const PLATFORM_SYSTEM_ROLE_NAMES = [
  "Platform Super Admin",
  "Super Admin",
  "User Manager",
] as const;

export const CUSTOMER_SYSTEM_ROLE_NAMES = [
  "Organization Owner",
  "Builder Admin",
  "Builder Supervisor",
  "Independent Contractor Owner",
  "Project Manager",
  "Contractor Member",
  "Site Supervisor",
  "Sales User",
  "Viewer",
  "Member",
  "Contractor",
  "Supervisor",
] as const;

export const ORGANIZATION_ROLE_NAMES_BY_TYPE = {
  BUILDER: [
    "Organization Owner",
    "Builder Admin",
    "Builder Supervisor",
    "Project Manager",
    "Contractor Member",
    "Site Supervisor",
    "Sales User",
    "Viewer",
    "Member",
  ],
  CONTRACTOR: [
    "Independent Contractor Owner",
    "Project Manager",
    "Contractor Member",
    "Site Supervisor",
    "Viewer",
    "Member",
  ],
} as const satisfies Record<OrganizationType, readonly string[]>;

export function isPlatformSystemRoleName(roleName: string): boolean {
  return (PLATFORM_SYSTEM_ROLE_NAMES as readonly string[]).includes(roleName);
}

export function isCustomerSystemRoleName(roleName: string): boolean {
  return (CUSTOMER_SYSTEM_ROLE_NAMES as readonly string[]).includes(roleName);
}

export function isOrganizationRoleCompatible(
  organizationType: OrganizationType,
  roleName: string,
): boolean {
  return (
    ORGANIZATION_ROLE_NAMES_BY_TYPE[organizationType] as readonly string[]
  ).includes(roleName);
}
