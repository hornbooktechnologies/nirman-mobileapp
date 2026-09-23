"use client";
import Link from "next/link";
import { Suspense, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { UNIT_STATUSES, type UnitStatus } from "@nirman-app/shared";
import { Button, Card, LoadingState } from "@/components/ui";
import { SalesWorkspace, type SalesContext } from "./sales-workspace";
import { Failure, Status, money, dateTime } from "./sales-ui";
import { useUnits } from "../hooks/use-inventory";
import { inventoryService } from "../services/inventory.service";
import { inventoryPermission } from "../inventory-rules";
import { salesKey } from "../sales-rules";
import { useSalesLifetime } from "../hooks/use-sales";
import { UnitForm } from "./unit-form";
import { SalesFilters } from "./sales-filters";
import { salesDetailUrl, salesListUrl } from "../sales-view";
function Inventory({ c }: { c: SalesContext }) {
  const params = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const search = (params.get("search") ?? "").slice(0, 120);
  const status = UNIT_STATUSES.find((value) => value === params.get("status")) ?? "";
  const [adding, setAdding] = useState(false);
  const [success, setSuccess] = useState("");
  const cache = useQueryClient();
  const live = useSalesLifetime();
  const units = useUnits(c.org, c.project, {
    search: search || undefined,
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
      <SalesFilters
        name="units"
        scope="Availability and block expiry come from the server. Interest does not reserve a unit."
        search={{ value: search, placeholder: "Unit number, type or tower", maxLength: 120, onChange: (value) => router.replace(salesListUrl(pathname, params, { search: value }), { scroll: false }) }}
        value={{ status }}
        fields={[{ key: "status", name: "Status", options: UNIT_STATUSES }]}
        onApply={(value) => router.replace(salesListUrl(pathname, params, value), { scroll: false })}
      />
      <Button variant="outline" disabled={units.isFetching} onClick={() => void units.refetch()}>
        {units.isFetching ? "Refreshing…" : "Refresh"}
      </Button>
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
                      href={salesDetailUrl(`${root}/${u.id}`, salesListUrl(pathname, params, {}))}
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
    <Suspense fallback={<LoadingState label="Loading inventory" />}>
      <SalesWorkspace projectId={projectId} section="inventory">
        {(c) => <Inventory c={c} />}
      </SalesWorkspace>
    </Suspense>
  );
}
