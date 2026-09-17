import { KHARCHI_BALANCE_STATUSES, KHARCHI_PAYMENT_METHODS } from "@nirman-app/shared";
import type { KharchiQuery } from "./services/kharchi.service";

export function kharchiQueryFromUrl(params: Record<string, string | string[] | undefined>): KharchiQuery {
  const query: KharchiQuery = {};
  const value = (key: string) => typeof params[key] === "string" ? params[key] as string : "";
  if (/^[1-9]\d*$/.test(value("page"))) query.page = Math.min(Number(value("page")), 1000000);
  if (value("search")) query.search = value("search").slice(0, 120);
  for (const key of ["workerId", "workerAssignmentId"] as const) if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value(key))) query[key] = value(key);
  for (const key of ["startDate", "endDate"] as const) {
    const date = value(key);
    if (/^\d{4}-\d{2}-\d{2}$/.test(date) && !Number.isNaN(Date.parse(`${date}T12:00:00Z`)) && new Date(`${date}T12:00:00Z`).toISOString().slice(0, 10) === date) query[key] = date;
  }
  if (query.startDate && query.endDate && query.endDate < query.startDate) delete query.endDate;
  const status = value("status");
  if (KHARCHI_BALANCE_STATUSES.some(s => s === status)) query.status = status as KharchiQuery["status"];
  const method = value("paymentMethod");
  if (KHARCHI_PAYMENT_METHODS.some(m => m === method)) query.paymentMethod = method as KharchiQuery["paymentMethod"];
  const sort = value("sortBy");
  if (["requestDate", "createdAt", "workerName", "outstandingAmount"].includes(sort)) query.sortBy = sort as KharchiQuery["sortBy"];
  if (["asc", "desc"].includes(value("sortOrder"))) query.sortOrder = value("sortOrder") as KharchiQuery["sortOrder"];
  return query;
}
