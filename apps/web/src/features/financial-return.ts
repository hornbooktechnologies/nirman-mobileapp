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
  return value && (value === fallback || value.startsWith(`${fallback}?`)) && !value.includes("#") && !value.includes("\\") && !value.includes("//") ? value : fallback;
}
