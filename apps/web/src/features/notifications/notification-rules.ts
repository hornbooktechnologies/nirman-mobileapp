import type { NotificationItem } from "@nirman-app/shared";

export const notificationKey = (user: string, org: string) =>
  ["notifications", user, org] as const;
export function ownsNotification(
  item: Pick<NotificationItem, "userId" | "organizationId">,
  user: string,
  org: string,
) {
  return item.userId === user && item.organizationId === org;
}
export function notificationTarget(
  item: NotificationItem,
  user: string,
  org: string,
  projects: readonly { id: string; permissions: readonly string[] }[],
) {
  if (!ownsNotification(item, user, org))
    throw new Error("This notification belongs to a different workspace.");
  const project = projects.find((p) => p.id === item.projectId);
  if (!project)
    throw new Error(
      "This project is no longer available to you. Refresh access or contact your administrator.",
    );
  const type = item.referenceType?.toLowerCase();
  const targets: Record<
    string,
    { path: string; permissions: string[]; exact: boolean }
  > = {
    material_request: {
      path: "materials",
      permissions: ["materials:read"],
      exact: true,
    },
    site_expense: {
      path: "expenses",
      permissions: ["expenses:read"],
      exact: true,
    },
    gallery_entry: {
      path: "gallery",
      permissions: ["gallery:read"],
      exact: false,
    },
    lead: {
      path: "sales/leads",
      permissions: ["leads:read-own", "leads:read-team", "leads:read-all"],
      exact: true,
    },
    unit: {
      path: "sales/inventory",
      permissions: ["inventory:read"],
      exact: true,
    },
    site_visit: {
      path: "sales/site-visits",
      permissions: ["leads:read-own", "leads:read-team", "leads:read-all"],
      exact: false,
    },
    wage_payment: { path: "wages", permissions: ["wages:read"], exact: false },
  };
  const target =
    type && Object.hasOwn(targets, type) ? targets[type] : undefined;
  if (!target)
    throw new Error("This notification has no supported Web destination.");
  if (!target.permissions.some((p) => project.permissions.includes(p)))
    throw new Error("You no longer have permission to view this record.");
  const base = `/projects/${encodeURIComponent(project.id)}/${target.path}`;
  return {
    href:
      target.exact && item.referenceId
        ? `${base}/${encodeURIComponent(item.referenceId)}`
        : base,
    exact: target.exact && Boolean(item.referenceId),
    type,
  };
}
