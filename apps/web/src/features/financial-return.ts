export function financialListHref(projectId: string, module: "materials" | "expenses", query: Record<string, unknown>) {
  const path = `/projects/${encodeURIComponent(projectId)}/${module}`;
  const params = new URLSearchParams();
  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== null && key !== "pageSize") params.set(key, String(value));
  });
  return `${path}${params.size ? `?${params}` : ""}`;
}

export function safeFinancialReturn(value: string | null, projectId: string, module: "materials" | "expenses") {
  const fallback = `/projects/${encodeURIComponent(projectId)}/${module}`;
  return totalExpensesReturn(value, projectId) ?? (value && (value === fallback || value.startsWith(`${fallback}?`)) && !value.includes("#") && !value.includes("\\") && !value.includes("//") ? value : fallback);
}

export function totalExpensesReturn(value: string | null | undefined, projectId: string): string | null {
 const path=`/projects/${encodeURIComponent(projectId)}/total-expenses`;
 return value && (value===path || value.startsWith(`${path}?`)) && !value.includes('#') && !value.includes('\\') && !value.includes('//') ? value : null;
}
