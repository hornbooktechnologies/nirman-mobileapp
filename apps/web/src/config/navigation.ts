import {
  Building2,
  Bell,
  Grid2X2,
  HardHat,
  IdCard,
  CalendarCheck,
  CalendarDays,
  Settings,
  ShieldCheck,
  UserCircle,
  UsersRound,
  Users,
  CreditCard,
  Wallet,
  Package,
  Receipt,
  ChartNoAxesCombined,
  Images,
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
    items: [{ label: "Home", href: "/dashboard", icon: Grid2X2 }, { label: "Notifications", href: "/notifications", icon: Bell, permission: "notifications:read" }],
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
      { label: "Work Calendar", href: "/work-calendar", icon: CalendarDays, permission: "work-calendar:read" },
      { label: "Attendance", href: "/attendance", icon: CalendarCheck, permission: "attendance:read" },
      { label: "Settings", href: "/settings", icon: Settings, permission: "platform-settings:read" },
    ],
  },
  {
    label: "Workforce & Finance",
    items: [
      { label: "Kharchi", href: "/kharchi", icon: Wallet, permission: "kharchi:read" },
      { label: "Site Expenses", href: "/expenses", icon: Receipt, permission: "expenses:read" },
    ],
  },
  {
    label: "Project Operations",
    items: [{ label: "Gallery", href: "/gallery", icon: Images, permission: "gallery:read" }, { label: "Materials", href: "/materials", icon: Package, permission: "materials:read" }, { label: "Progress", href: "/progress", icon: ChartNoAxesCombined, permission: "progress:read" }],
  },
  {
    label: "Sales",
    items: [
      { label: "Bookings", href: "/sales/bookings", icon: Receipt, permissionAnyOf: ["leads:read-own", "leads:read-team", "leads:read-all"] },
      { label: "Inventory", href: "/sales/inventory", icon: Building2, permission: "inventory:read" },
      { label: "Leads", href: "/sales/leads", icon: UsersRound, permissionAnyOf: ["leads:read-own", "leads:read-team", "leads:read-all"] },
      { label: "Site Visits", href: "/sales/site-visits", icon: CalendarCheck, permissionAnyOf: ["leads:read-own", "leads:read-team", "leads:read-all"] },
      { label: "Follow-ups", href: "/sales/follow-ups", icon: CalendarCheck, permissionAnyOf: ["leads:read-own", "leads:read-team", "leads:read-all"] },
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
