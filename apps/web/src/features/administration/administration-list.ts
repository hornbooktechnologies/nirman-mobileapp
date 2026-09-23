export type AdministrationList = "organizations" | "users" | "roles";

export function platformUsersQuery(query: { page: number; pageSize: number; search?: string; roleId?: string }) {
  const params = new URLSearchParams({ page: String(query.page), pageSize: String(query.pageSize) });
  if (query.search) params.set("search", query.search);
  if (query.roleId) params.set("roleId", query.roleId);
  return params.toString();
}

export function administrationListUrl(pathname: string, params: { toString(): string }, updates: Record<string, string>, clear: readonly string[] = []) {
  const next = new URLSearchParams(params.toString());
  for (const key of clear) next.delete(key);
  for (const [key, value] of Object.entries(updates)) {
    if (value) next.set(key, value);
    else next.delete(key);
  }
  const query = next.toString();
  return query ? `${pathname}?${query}` : pathname;
}

export function administrationDetailUrl(path: string, listUrl: string) {
  return `${path}?returnTo=${encodeURIComponent(listUrl)}`;
}

export function safeAdministrationReturn(value: string | null, list: AdministrationList) {
  const base = `/${list}`;
  if (value === base) return base;
  if (!value?.startsWith(`${base}?`)) return base;
  const params = new URLSearchParams(value.slice(base.length + 1));
  const allowed = list === "organizations" ? ["search", "status", "type"] : list === "users" ? ["search", "roleId", "page"] : ["search", "kind"];
  let invalid = false;
  params.forEach((_, key) => { if (!allowed.includes(key)) invalid = true; });
  if (invalid) return base;
  return `${base}?${params.toString()}`;
}
