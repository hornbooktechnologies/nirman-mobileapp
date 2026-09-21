"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { UNIT_STATUSES, type UnitStatus } from "@nirman-app/shared";
import { Button, Card, Input, Select, LoadingState } from "@/components/ui";
import { SalesWorkspace, type SalesContext } from "./sales-workspace";
import { Failure, Status, money, dateTime } from "./sales-ui";
import { useUnits } from "../hooks/use-inventory";
import { inventoryService } from "../services/inventory.service";
import { inventoryPermission } from "../inventory-rules";
import { label, salesKey } from "../sales-rules";
import { useSalesLifetime } from "../hooks/use-sales";
import { UnitForm } from "./unit-form";
function Inventory({ c }: { c: SalesContext }) {
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [status, setStatus] = useState("");
  const [adding, setAdding] = useState(false);
  const [success, setSuccess] = useState("");
  const cache = useQueryClient();
  const live = useSalesLifetime();
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(search), 300);
    return () => clearTimeout(timer);
  }, [search]);
  const units = useUnits(c.org, c.project, {
    search: debounced || undefined,
    status: (status as UnitStatus) || undefined,
  });
  const root = `/projects/${c.project}/sales/inventory`;
  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Unit inventory</h1>
        {inventoryPermission(c.permissions, c.active, "inventory:manage") && (
          <div className="flex items-center gap-4">
            <Link className="underline" href={`${root}/import`}>
              Import CSV
            </Link>
            <Button onClick={() => setAdding(true)}>Add unit</Button>
          </div>
        )}
      </header>
      {success && <p role="status">{success}</p>}
      <Card className="flex flex-wrap items-end gap-4">
        <label className="flex-1">
          Search units
          <Input
            value={search}
            maxLength={120}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Unit number, type or tower"
          />
        </label>
        <label>
          Status
          <Select value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">All statuses</option>
            {UNIT_STATUSES.map((s) => (
              <option key={s} value={s}>
                {label(s)}
              </option>
            ))}
          </Select>
        </label>
        <Button
          variant="outline"
          disabled={units.isFetching}
          onClick={() => void units.refetch()}
        >
          {units.isFetching ? "Refreshing…" : "Refresh"}
        </Button>
      </Card>
      {units.isPending ? (
        <LoadingState label="Loading inventory" />
      ) : units.isError ? (
        <Failure error={units.error} retry={() => void units.refetch()} />
      ) : (
        <>
          <p className="text-sm text-sub">
            {units.data.length} units returned. Availability and expiry are
            refreshed from the server.
          </p>
          {!units.data.length ? (
            <Card>
              {search || status
                ? "No units match these filters."
                : "No units yet. Add a unit or import a CSV to get started."}
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {units.data.map((u) => (
                <Card key={u.id} className="space-y-3">
                  <div className="flex flex-wrap justify-between gap-2">
                    <Link
                      className="text-lg font-semibold underline"
                      href={`${root}/${u.id}`}
                    >
                      {u.unitNumber}
                    </Link>
                    <Status value={u.status} />
                  </div>
                  <p>
                    {[
                      u.unitType,
                      u.wingTower,
                      u.floor ? `Floor ${u.floor}` : null,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                  <p>
                    {u.areaSqft == null
                      ? "Area not provided"
                      : `${u.areaSqft} sq ft`}
                    {u.facing ? ` · ${u.facing}` : ""}
                  </p>
                  <p className="font-semibold tabular-nums">
                    {money(u.basePrice)}
                  </p>
                  {u.priceBasis === "PER_SQFT" && (
                    <p className="text-sm">
                      {money(u.ratePerSqft)} / sq ft · server-calculated total
                    </p>
                  )}
                  <p className="text-sm">
                    {u.interestCount} interested · {u.pendingHoldRequestCount}{" "}
                    pending holds
                  </p>
                  {u.blockExpiresAt && (
                    <p className="text-sm">
                      Block expires {dateTime(u.blockExpiresAt, c.timezone)}
                    </p>
                  )}
                </Card>
              ))}
            </div>
          )}
        </>
      )}
      {adding && (
        <UnitForm
          close={() => setAdding(false)}
          refresh={async () => {
            await inventoryService.units(c.org, c.project);
            await units.refetch();
          }}
          save={async (input) => {
            await inventoryService.create(c.org, c.project, input);
            if (!live.current) return;
            setAdding(false);
            setSuccess("Unit created.");
            void cache.invalidateQueries({
              queryKey: salesKey(c.org, c.project),
            });
          }}
        />
      )}
    </div>
  );
}
export function InventoryPage({ projectId }: { projectId?: string }) {
  return (
    <SalesWorkspace projectId={projectId} section="inventory">
      {(c) => <Inventory c={c} />}
    </SalesWorkspace>
  );
}
