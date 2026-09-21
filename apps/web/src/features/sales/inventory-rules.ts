import type { SalesUnit, UnitInput } from "./types/inventory.types";
export const priceMultipliers = {
  RUPEE: 1,
  LAKH: 100_000,
  CRORE: 10_000_000,
} as const;
export const editableUnit = (status: string) =>
  ["AVAILABLE", "SOLD", "UNAVAILABLE"].includes(status);
export const openUnit = (status: string) =>
  ["AVAILABLE", "BLOCKED"].includes(status);
export const inventoryPermission = (
  permissions: readonly string[],
  active: boolean,
  permission: string,
) =>
  active &&
  permissions.includes("inventory:read") &&
  permissions.includes(permission);
export const unitSnapshot = (u: SalesUnit) =>
  JSON.stringify([
    u.id,
    u.unitNumber,
    u.unitType,
    u.wingTower,
    u.floor,
    u.areaSqft,
    u.facing,
    u.basePrice,
    u.priceBasis,
    u.ratePerSqft,
    u.status,
    u.activeBlockId,
    u.blockedForLeadId,
    u.blockExpiresAt,
  ]);
export function validateUnit(v: Record<string, string>) {
  const errors: Record<string, string> = {};
  const positive = (key: string) => {
    if (!v[key] || !Number.isFinite(Number(v[key])) || Number(v[key]) <= 0)
      errors[key] = "Enter a number greater than zero.";
  };
  if (v.areaSqft) positive("areaSqft");
  if (v.priceBasis === "PER_SQFT") {
    positive("areaSqft");
    positive("ratePerSqft");
  } else {
    positive("totalPrice");
    if (!Object.hasOwn(priceMultipliers, v.priceUnit))
      errors.priceUnit = "Choose a price unit.";
    else if (
      !Number.isFinite(
        Number(v.totalPrice) *
          priceMultipliers[v.priceUnit as keyof typeof priceMultipliers],
      )
    )
      errors.totalPrice = "Enter a supported price.";
  }
  if (!editableUnit(v.status))
    errors.status = "Use the hold or booking workflow for this status.";
  return errors;
}
export function unitInput(v: Record<string, string>): UnitInput {
  return {
    unitNumber: v.unitNumber,
    unitType: v.unitType,
    wingTower: v.wingTower || undefined,
    floor: v.floor || undefined,
    facing: v.facing || undefined,
    areaSqft: v.areaSqft ? Number(v.areaSqft) : undefined,
    priceBasis: v.priceBasis as UnitInput["priceBasis"],
    status: v.status as UnitInput["status"],
    ...(v.priceBasis === "PER_SQFT"
      ? { ratePerSqft: Number(v.ratePerSqft) }
      : {
          basePrice:
            Number(v.totalPrice) *
            priceMultipliers[v.priceUnit as keyof typeof priceMultipliers],
        }),
  };
}
