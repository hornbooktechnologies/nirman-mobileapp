"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Button, Card, Input } from "@/components/ui";
import { SalesWorkspace, type SalesContext } from "./sales-workspace";
import { money } from "./sales-ui";
import {
  parseUnitImport,
  UNIT_IMPORT_COLUMNS,
  type LocalImportError,
} from "../unit-import";
import { inventoryService } from "../services/inventory.service";
import { inventoryPermission } from "../inventory-rules";
import { failureMessage, salesKey } from "../sales-rules";
import { useSalesLifetime } from "../hooks/use-sales";
import type { UnitInput, UnitImportPreview } from "../types/inventory.types";
const errors: Record<string, string> = {
  EMPTY_FILE: "The CSV has no data rows.",
  MISSING_HEADER: "Required column missing.",
  LIMIT: "Import at most 500 units at once.",
  REQUIRED: "A required value is missing.",
  POSITIVE_NUMBER: "Enter a number greater than zero.",
  PRICE_METHOD: "Use TOTAL or PER_SQFT.",
  PRICE_UNIT: "Use RUPEE, LAKH or CRORE.",
  STATUS: "Use AVAILABLE, SOLD or UNAVAILABLE.",
  UNIT_IMPORT_DUPLICATE_IN_FILE: "Unit number is repeated in this file.",
  UNIT_NUMBER_DUPLICATE: "Unit number already exists in this project.",
  UNIT_STATUS_MANAGED_BY_WORKFLOW:
    "Blocked and booked statuses require workflow actions.",
  UNIT_PRICE_INVALID:
    "Invalid price. Check the pricing method, area and amount.",
  MALFORMED_CSV: "CSV quoting, headers or column count is invalid.",
  TOO_LONG: "Value exceeds the supported field length.",
};
function Import({ c }: { c: SalesContext }) {
  const [units, setUnits] = useState<UnitInput[]>([]);
  const [preview, setPreview] = useState<UnitImportPreview>();
  const [localErrors, setLocalErrors] = useState<LocalImportError[]>([]);
  const [name, setName] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const locked = useRef(false);
  const live = useSalesLifetime();
  const cache = useQueryClient();
  useEffect(() => {
    const unload = (e: BeforeUnloadEvent) => {
      if (locked.current || (units.length && !success)) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    const navigate = (e: MouseEvent) => {
      if (!(e.target instanceof Element) || !e.target.closest("a[href]") || e.ctrlKey || e.metaKey || e.shiftKey) return;
      if (locked.current || (units.length && !success && !window.confirm("Discard this import preview?"))) {
        e.preventDefault();
        e.stopPropagation();
      }
    };
    window.addEventListener("beforeunload", unload);
    document.addEventListener("click", navigate, true);
    return () => { window.removeEventListener("beforeunload", unload); document.removeEventListener("click", navigate, true); };
  }, [units.length, success]);
  async function run(operation: () => Promise<void>) {
    if (locked.current) return;
    locked.current = true;
    setPending(true);
    setError("");
    try {
      await operation();
    } catch (cause) {
      if (live.current) {
        setError(failureMessage(cause));
        const details = (cause as { details?: UnitImportPreview }).details;
        if (details && Array.isArray(details.rows)) setPreview(details);
      }
    } finally {
      locked.current = false;
      if (live.current) setPending(false);
    }
  }
  const valid = Boolean(
    preview &&
    !preview.invalidCount &&
    preview.totalCount === units.length &&
    !localErrors.length &&
    units.length,
  );
  if (!inventoryPermission(c.permissions, c.active, "inventory:manage"))
    return (
      <Card role="alert">
        An active project and inventory management permission are required to
        import units.
      </Card>
    );
  return (
    <div className="space-y-5">
      <Link
        className="underline"
        href={`/projects/${c.project}/sales/inventory`}
      >
        Back to inventory
      </Link>
      <h1 className="text-2xl font-semibold">Import unit inventory</h1>
      <Card className="space-y-4">
        <p>
          Upload 1–500 units. Every row must pass validation before the entire
          file is imported.
        </p>
        <p className="break-words text-sm">
          Columns: {UNIT_IMPORT_COLUMNS.join(", ")}
        </p>
        <p>
          TOTAL requires totalPrice and priceUnit (RUPEE, LAKH or CRORE).
          PER_SQFT requires areaSqft and ratePerSqft; the server calculates the
          total. Allowed statuses: AVAILABLE, SOLD, UNAVAILABLE.
        </p>
        <Button
          variant="outline"
          onClick={() => {
            const url = URL.createObjectURL(
              new Blob([UNIT_IMPORT_COLUMNS.join(",") + "\n"], {
                type: "text/csv;charset=utf-8",
              }),
            );
            const a = document.createElement("a");
            a.href = url;
            a.download = "unit-import-template.csv";
            a.click();
            setTimeout(() => URL.revokeObjectURL(url), 1000);
          }}
        >
          Download CSV template
        </Button>
        <label className="block">
          CSV file
          <Input
            type="file"
            accept=".csv,text/csv,text/plain"
            disabled={pending}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              void run(async () => {
                setPreview(undefined);
                setUnits([]);
                setLocalErrors([]);
                setSuccess("");
                setName(file.name);
                if (file.size > 5 * 1024 * 1024)
                  throw new Error("Choose a CSV smaller than 5 MB.");
                const parsed = parseUnitImport(await file.text());
                if (!live.current) return;
                setUnits(parsed.units);
                setLocalErrors(parsed.errors);
                if (!parsed.errors.length) {
                  const result = await inventoryService.preview(
                    c.org,
                    c.project,
                    parsed.units,
                  );
                  if (live.current) setPreview(result);
                }
              });
            }}
          />
        </label>
      </Card>
      {pending && <p role="status">Processing…</p>}
      {error && <Card role="alert">{error}</Card>}
      {success && <Card role="status">{success}</Card>}
      {name && <h2 className="text-lg font-semibold break-words">{name}</h2>}
      {localErrors.length > 0 && (
        <Card role="alert">
          <ul className="space-y-2">
            {localErrors.map((e, i) => (
              <li key={i}>
                Row {e.rowNumber}
                {e.field ? ` · ${e.field}` : ""}: {errors[e.code] ?? e.code}
              </li>
            ))}
          </ul>
        </Card>
      )}
      {preview && (
        <>
          <p>
            {preview.totalCount} rows · {preview.validCount} valid ·{" "}
            {preview.invalidCount} invalid
          </p>
          <div className="space-y-3">
            {preview.rows.map((row) => (
              <Card key={row.rowNumber}>
                <p className="font-semibold">
                  Row {row.rowNumber} · {row.unit.unitNumber} ·{" "}
                  {row.unit.unitType}
                </p>
                <p>
                  {row.unit.wingTower} {row.unit.floor} · {row.unit.status} ·{" "}
                  {money(row.unit.basePrice ?? null)}
                </p>
                {row.errors.map((code, index) => (
                  <p role="alert" key={`${code}-${index}`}>
                    {errors[code] ?? code}
                  </p>
                ))}
              </Card>
            ))}
          </div>
        </>
      )}
      {!!units.length && !localErrors.length && !success && (
        <div className="flex flex-wrap gap-3">
          <Button
            variant="outline"
            disabled={pending}
            onClick={() =>
              void run(async () => {
                setPreview(undefined);
                const result = await inventoryService.preview(
                  c.org,
                  c.project,
                  units,
                );
                if (live.current) setPreview(result);
              })
            }
          >
            Refresh server preview
          </Button>
          <Button
            disabled={pending || !valid}
            onClick={() =>
              void run(async () => {
                setPreview(undefined);
                const result = await inventoryService.import(
                  c.org,
                  c.project,
                  units,
                );
                if (!live.current) return;
                setSuccess(
                  `${result.importedCount} units imported successfully.`,
                );
                await cache.invalidateQueries({
                  queryKey: salesKey(c.org, c.project),
                });
              })
            }
          >
            Import {units.length} units
          </Button>
        </div>
      )}
    </div>
  );
}
export function UnitImportPage({ projectId }: { projectId: string }) {
  return (
    <SalesWorkspace projectId={projectId} section="inventory">
      {(c) => <Import c={c} />}
    </SalesWorkspace>
  );
}
