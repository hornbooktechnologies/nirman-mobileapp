import { useQuery } from "@tanstack/react-query";
import { salesKey } from "../sales-rules";
import {
  inventoryService,
  type UnitQuery,
} from "../services/inventory.service";
export const useUnits = (o: string, p: string, query: UnitQuery = {}) =>
  useQuery({
    queryKey: [...salesKey(o, p), "inventory", query],
    queryFn: ({ signal }) => inventoryService.units(o, p, query, signal),
    refetchInterval: 60_000,
  });
export const useUnitInterests = (o: string, p: string, unit: string) =>
  useQuery({
    queryKey: [...salesKey(o, p), "unit-interests", unit],
    queryFn: ({ signal }) => inventoryService.interests(o, p, unit, signal),
  });
