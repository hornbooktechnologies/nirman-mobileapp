"use client";
import { UNIT_PRICE_BASES, UNIT_PRICE_INPUT_UNITS } from "@nirman-app/shared";
import { SalesForm, type Field } from "./sales-form";
import type { SalesUnit, UnitInput } from "../types/inventory.types";
import { unitInput, validateUnit } from "../inventory-rules";
export function UnitForm({
  unit,
  save,
  close,
  refresh,
}: {
  unit?: SalesUnit;
  save: (input: UnitInput) => Promise<void>;
  close: () => void;
  refresh: () => Promise<unknown>;
}) {
  const fields: Field[] = [
    {
      name: "unitNumber",
      label: "Unit number",
      required: true,
      maxLength: 80,
      initial: unit?.unitNumber,
    },
    {
      name: "unitType",
      label: "Unit type",
      required: true,
      maxLength: 80,
      initial: unit?.unitType,
    },
    {
      name: "wingTower",
      label: "Wing / tower",
      maxLength: 80,
      initial: unit?.wingTower ?? "",
    },
    {
      name: "floor",
      label: "Floor",
      maxLength: 40,
      initial: unit?.floor ?? "",
    },
    {
      name: "areaUnit",
      label: "Area unit",
      required: true,
      options: [
        { value: "SQ_FT", label: "Square feet" },
        { value: "SQ_YD", label: "Square yard (Vaar)" },
      ],
      initial: "SQ_FT",
      help: unit
        ? "Existing area is stored and shown in square feet."
        : "Choose the unit used for the area entered below.",
    },
    {
      name: "areaSqft",
      requiredWhen: { field: "priceBasis", value: "PER_SQFT" },
      label: "Area",
      numeric: {
        kind: "decimal",
        min: 0,
        exclusiveMin: true,
        message: "Enter a number greater than zero.",
      },
      initial: unit?.areaSqft?.toString(),
      help: "Required for per-square-foot pricing. Square yard values are converted to square feet.",
    },
    {
      name: "facing",
      label: "Facing",
      maxLength: 80,
      initial: unit?.facing ?? "",
    },
    {
      name: "priceBasis",
      label: "Pricing method",
      options: UNIT_PRICE_BASES,
      required: true,
      initial: unit?.priceBasis ?? "TOTAL",
    },
    {
      name: "totalPrice",
      showWhen: { field: "priceBasis", value: "TOTAL" },
      required: true,
      label: "Total price",
      numeric: {
        kind: "decimal",
        min: 0,
        exclusiveMin: true,
        message: "Enter a number greater than zero.",
      },
      initial: unit?.priceBasis === "TOTAL" ? unit.basePrice?.toString() : "",
      help: "Used only for Total pricing.",
    },
    {
      name: "priceUnit",
      showWhen: { field: "priceBasis", value: "TOTAL" },
      required: true,
      label: "Total price unit",
      options: UNIT_PRICE_INPUT_UNITS,
      initial: "RUPEE",
    },
    {
      name: "ratePerSqft",
      showWhen: { field: "priceBasis", value: "PER_SQFT" },
      required: true,
      label: "Rate per sq ft (₹)",
      numeric: {
        kind: "decimal",
        min: 0,
        exclusiveMin: true,
        message: "Enter a number greater than zero.",
      },
      initial: unit?.ratePerSqft?.toString(),
      help: "Used only for Per sqft. The server calculates the total.",
    },
    {
      name: "status",
      label: "Availability",
      required: true,
      options: ["AVAILABLE", "SOLD", "UNAVAILABLE"],
      initial: unit?.status ?? "AVAILABLE",
    },
  ];
  return (
    <SalesForm
      title={unit ? `Edit unit · ${unit.unitNumber}` : "Add unit"}
      fields={fields}
      validate={validateUnit}
      save={(v) => save(unitInput(v))}
      close={close}
      refresh={refresh}
    />
  );
}
