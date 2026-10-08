import type { SalesSiteVisit } from './types/sales.types';

export function siteVisitSalespeople(visits: readonly Pick<SalesSiteVisit, 'assignedSalesperson' | 'assignedSalespersonName'>[]) {
  const names = new Map<string, string>();
  for (const visit of visits) {
    const name = visit.assignedSalespersonName?.trim();
    if (name || !names.has(visit.assignedSalesperson)) names.set(visit.assignedSalesperson, name || 'Name unavailable');
  }
  return Array.from(names, ([value, label]) => ({ value, label })).sort((a, b) => a.label.localeCompare(b.label));
}

export function namedFilterLabel(value: string, labels: Record<string, string>, name: string, loading = false) {
  return labels[value] || (loading ? `Loading ${name.toLowerCase()}…` : `${name} unavailable`);
}
