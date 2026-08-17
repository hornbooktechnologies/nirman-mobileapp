import {
  Building2,
  Grid2X2,
  HardHat,
  IdCard,
  Settings,
  ShieldCheck,
  UserCircle,
  UsersRound,
  Users,
  CreditCard,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  permission?: string;
  permissionAnyOf?: readonly string[];
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

export const navGroups: NavGroup[] = [
  {
    label: "Main",
    items: [{ label: "Home", href: "/dashboard", icon: Grid2X2 }],
  },
  {
    label: "Administration",
    items: [
      { label: "Users", href: "/users", icon: Users, permission: "platform-users:read" },
      { label: "Roles & Permissions", href: "/roles", icon: ShieldCheck, permission: "platform-roles:read" },
      {
        label: "Organizations",
        href: "/organizations",
        icon: Building2,
        permissionAnyOf: ["platform-organizations:read", "organizations:read"],
      },
      {
        label: "Subscriptions",
        href: "/subscriptions",
        icon: CreditCard,
        permission: "platform-subscriptions:read",
      },
      {
        label: "Members",
        href: "/members",
        icon: UsersRound,
        permission: "members:read",
      },
      { label: "Projects", href: "/projects", icon: HardHat, permission: "projects:read" },
      { label: "Workers", href: "/workers", icon: IdCard, permission: "workers:read" },
      { label: "Settings", href: "/settings", icon: Settings, permission: "platform-settings:read" },
    ],
  },
  {
    label: "Account",
    items: [{ label: "Profile", href: "/profile", icon: UserCircle }],
  },
];

export function getRouteTitle(pathname: string) {
  const item = navGroups
    .flatMap((group) => group.items)
    .find((entry) => pathname === entry.href || pathname.startsWith(`${entry.href}/`));

  return item?.label ?? "Workspace";
}
