export const FINANCIAL_DATA_CHANGED = "nirman:financial-data-changed";
export function financialMutationScope(
  url: string | undefined,
  method: string | undefined,
) {
  if (
    !url ||
    !["post", "put", "patch", "delete"].includes(method?.toLowerCase() ?? "")
  )
    return null;
  const match =
    /^\/organizations\/([^/]+)\/projects\/([^/]+)\/(?:materials|expenses|wages)(?:\/|$)/.exec(
      url.split("?")[0],
    );
  return match ? { organizationId: match[1], projectId: match[2] } : null;
}
