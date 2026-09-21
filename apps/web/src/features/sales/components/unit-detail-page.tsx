"use client";
import Link from "next/link";
import { useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Button, Card, LoadingState } from "@/components/ui";
import { SalesWorkspace, type SalesContext } from "./sales-workspace";
import { Failure, Status, money, dateTime } from "./sales-ui";
import { UnitForm } from "./unit-form";
import {
  UnitWorkflowForm,
  type UnitAction,
  type WorkflowValues,
} from "./unit-workflow-form";
import { useUnits, useUnitInterests } from "../hooks/use-inventory";
import { useSalesLifetime } from "../hooks/use-sales";
import { inventoryService } from "../services/inventory.service";
import { salesService } from "../services/sales.service";
import { canReadSales, canWriteLead, salesKey } from "../sales-rules";
import {
  editableUnit,
  inventoryPermission,
  openUnit,
  unitSnapshot,
} from "../inventory-rules";
import type { SalesUnit, SalesUnitInterest } from "../types/inventory.types";
function UnitDetail({ c, id }: { c: SalesContext; id: string }) {
  const units = useUnits(c.org, c.project);
  const interests = useUnitInterests(c.org, c.project, id);
  const cache = useQueryClient();
  const live = useSalesLifetime();
  const [dialog, setDialog] = useState<"edit" | UnitAction | null>(null);
  const [selected, setSelected] = useState<SalesUnitInterest>();
  const [success, setSuccess] = useState("");
  const [refreshError, setRefreshError] = useState<unknown>(null);
  const snapshot = useRef<SalesUnit | undefined>(undefined);
  const unit = units.data?.find((u) => u.id === id);
  const can = (p: string) => inventoryPermission(c.permissions, c.active, p);
  const leadActions = canReadSales(c.permissions) && can("leads:update");
  async function refresh() {
    setRefreshError(null);
    const [current] = await Promise.all([
      inventoryService.units(c.org, c.project),
      inventoryService.interests(c.org, c.project, id),
    ]);
    snapshot.current = current.find((u) => u.id === id);
    await cache.invalidateQueries({ queryKey: salesKey(c.org, c.project) });
  }
  async function preflight() {
    const current = (await inventoryService.units(c.org, c.project)).find(
      (u) => u.id === id,
    );
    if (
      !current ||
      !snapshot.current ||
      unitSnapshot(current) !== unitSnapshot(snapshot.current)
    )
      throw new Error(
        "This unit changed. Refresh and review its current availability and pricing before continuing.",
      );
    return current;
  }
  function open(action: typeof dialog, interest?: SalesUnitInterest) {
    snapshot.current = unit;
    setSelected(interest);
    setDialog(action);
  }
  async function done() {
    if (!live.current) return;
    setDialog(null);
    setSuccess(
      "Saved successfully. Availability and related lead history have been refreshed.",
    );
    await cache.invalidateQueries({ queryKey: salesKey(c.org, c.project) });
  }
  async function workflow(v: WorkflowValues) {
    const current = await preflight();
    if (!live.current) return;
    if (v.leadId && ["interest", "request", "block"].includes(dialog ?? "")) {
      const lead = await salesService.lead(c.org, c.project, v.leadId);
      if (
        !canWriteLead(c.permissions, c.active, "leads:update", lead, c.user) ||
        lead.currentStage === "BOOKED"
      )
        throw new Error(
          "This lead is no longer writable. Refresh its assignment and status.",
        );
    }
    if (!live.current) return;
    if (
      selected &&
      ["request", "APPROVED", "REJECTED"].includes(dialog ?? "")
    ) {
      const latest = (
        await inventoryService.interests(c.org, c.project, id)
      ).find((i) => i.id === selected.id);
      if (
        !latest ||
        latest.updatedAt !== selected.updatedAt ||
        latest.holdRequestId !== selected.holdRequestId ||
        latest.status !== selected.status
      )
        throw new Error(
          "This interest or hold request changed. Close this form and review the current queue.",
        );
    }
    if (!live.current) return;
    if (dialog === "interest" && v.leadId)
      await inventoryService.interest(c.org, c.project, id, {
        leadId: v.leadId,
        status: v.status,
        notes: v.notes,
      });
    else if (dialog === "request" && v.leadId)
      await inventoryService.request(c.org, c.project, id, {
        leadId: v.leadId,
        notes: v.notes,
      });
    else if (dialog === "block" && v.leadId)
      await inventoryService.block(c.org, c.project, id, {
        leadId: v.leadId,
        notes: v.notes,
        expiresAt: v.expiresAt,
      });
    else if (dialog === "release" && current.activeBlockId)
      await inventoryService.release(c.org, c.project, current.activeBlockId);
    else if (
      (dialog === "APPROVED" || dialog === "REJECTED") &&
      selected?.holdRequestId
    )
      await inventoryService.decide(c.org, c.project, selected.holdRequestId, {
        decision: dialog,
        notes: v.notes,
        expiresAt: v.expiresAt,
      });
    else
      throw new Error("The action is no longer available. Refresh this unit.");
    await done();
  }
  if (units.isPending) return <LoadingState label="Loading unit" />;
  if (units.isError)
    return <Failure error={units.error} retry={() => void units.refetch()} />;
  if (!unit)
    return (
      <Card>
        This unit is no longer available in this project.{" "}
        <Link
          className="underline"
          href={`/projects/${c.project}/sales/inventory`}
        >
          Return to inventory
        </Link>
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
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">{unit.unitNumber}</h1>
        <Status value={unit.status} />
      </header>
      {success && <p role="status">{success}</p>}
      {refreshError != null && (
        <Failure
          error={refreshError}
          retry={() => void refresh().catch(setRefreshError)}
        />
      )}
      <Card>
        <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[
            ["Unit type", unit.unitType],
            [
              "Tower / floor",
              [unit.wingTower, unit.floor].filter(Boolean).join(" / "),
            ],
            ["Area", unit.areaSqft == null ? null : `${unit.areaSqft} sq ft`],
            ["Facing", unit.facing],
            ["Total price", money(unit.basePrice)],
            [
              "Pricing method",
              unit.priceBasis === "PER_SQFT"
                ? `${money(unit.ratePerSqft)} / sq ft (server total)`
                : "Total",
            ],
            [
              "Block expiry",
              unit.blockExpiresAt
                ? dateTime(unit.blockExpiresAt, c.timezone)
                : null,
            ],
            ["Blocked by", unit.blockedBy],
          ].map(([name, value]) => (
            <div key={name}>
              <dt className="text-sm text-sub">{name}</dt>
              <dd className="break-words font-medium">
                {value || "Not provided"}
              </dd>
            </div>
          ))}
        </dl>
        {unit.blockedForLeadId && (
          <p className="mt-4">
            Blocked for lead:{" "}
            {canReadSales(c.permissions) ? (
              <Link
                className="underline"
                href={`/projects/${c.project}/sales/leads/${unit.blockedForLeadId}`}
              >
                View customer and history
              </Link>
            ) : (
              unit.blockedForLeadId
            )}
          </p>
        )}
      </Card>
      <div className="flex flex-wrap gap-3">
        <Button
          variant="outline"
          onClick={() => void refresh().catch(setRefreshError)}
          disabled={units.isFetching}
        >
          Refresh
        </Button>
        {can("inventory:manage") && editableUnit(unit.status) && (
          <Button onClick={() => open("edit")}>Edit unit</Button>
        )}
        {leadActions && can("inventory:interest") && openUnit(unit.status) && (
          <Button onClick={() => open("interest")}>Record interest</Button>
        )}
        {leadActions &&
          can("inventory:block") &&
          unit.status === "AVAILABLE" && (
            <Button variant="outline" onClick={() => open("block")}>
              Direct block
            </Button>
          )}
        {can("inventory:block") &&
          unit.status === "BLOCKED" &&
          unit.activeBlockId && (
            <Button variant="danger" onClick={() => open("release")}>
              Release block
            </Button>
          )}
      </div>
      <section className="space-y-4">
        <h2 className="text-xl font-semibold">
          Interested customers and hold requests
        </h2>
        <p className="text-sm text-sub">
          Interest does not reserve a unit. Hold approval creates an exclusive
          block; expiry is reconciled by the server on refresh.
        </p>
        {interests.isPending ? (
          <LoadingState label="Loading interested customers" />
        ) : interests.isError ? (
          <Failure
            error={interests.error}
            retry={() => void interests.refetch()}
          />
        ) : !interests.data.length ? (
          <Card>No interests visible to you for this unit.</Card>
        ) : (
          interests.data.map((i) => (
            <Card key={i.id} className="space-y-3">
              <div className="flex flex-wrap justify-between gap-3">
                <div>
                  <h3 className="font-semibold">{i.customerName}</h3>
                  <p>
                    {i.primaryMobile} · {i.assignedToName ?? "Unassigned"}
                  </p>
                </div>
                <Status value={i.status} />
              </div>
              <p>
                {i.leadStage.replaceAll("_", " ")} · {i.leadPriority} priority
              </p>
              {i.notes && <p className="whitespace-pre-wrap">{i.notes}</p>}
              <p className="text-sm">
                Last activity: {dateTime(i.lastActivityAt, c.timezone)} · Next
                follow-up: {dateTime(i.nextFollowUpAt, c.timezone)}
              </p>
              {i.holdRequestId && (
                <p className="whitespace-pre-wrap">
                  Pending hold · {dateTime(i.holdRequestedAt, c.timezone)}
                  {i.holdRequestNotes ? ` · ${i.holdRequestNotes}` : ""}
                </p>
              )}
              <div className="flex flex-wrap items-center gap-3">
                {canReadSales(c.permissions) && (
                  <Link
                    className="underline"
                    href={`/projects/${c.project}/sales/leads/${i.leadId}`}
                  >
                    Lead and history
                  </Link>
                )}
                {leadActions &&
                  can("inventory:interest") &&
                  openUnit(unit.status) &&
                  i.leadStage !== "BOOKED" && (
                    <Button
                      variant="outline"
                      onClick={() => open("interest", i)}
                    >
                      Update interest
                    </Button>
                  )}
                {leadActions &&
                  can("inventory:request-block") &&
                  i.status !== "WITHDRAWN" &&
                  !i.holdRequestId &&
                  i.leadStage !== "BOOKED" &&
                  openUnit(unit.status) && (
                    <Button onClick={() => open("request", i)}>
                      Request hold
                    </Button>
                  )}
                {can("inventory:block") &&
                  i.holdRequestId &&
                  i.holdRequestStatus === "PENDING" && (
                    <>
                      <Button
                        disabled={unit.status !== "AVAILABLE"}
                        onClick={() => open("APPROVED", i)}
                      >
                        Approve hold
                      </Button>
                      <Button
                        variant="danger"
                        onClick={() => open("REJECTED", i)}
                      >
                        Reject hold
                      </Button>
                    </>
                  )}
              </div>
            </Card>
          ))
        )}
      </section>
      {dialog === "edit" && (
        <UnitForm
          unit={unit}
          close={() => setDialog(null)}
          refresh={refresh}
          save={async (input) => {
            const current = await preflight();
            if (!editableUnit(current.status))
              throw new Error(
                "Blocked and booked units cannot be edited here.",
              );
            if (!live.current) return;
            await inventoryService.update(c.org, c.project, id, input);
            await done();
          }}
        />
      )}
      {dialog && dialog !== "edit" && (
        <UnitWorkflowForm
          c={c}
          action={dialog}
          interest={selected}
          close={() => setDialog(null)}
          refresh={refresh}
          save={workflow}
        />
      )}
    </div>
  );
}
export function UnitDetailPage({
  projectId,
  unitId,
}: {
  projectId: string;
  unitId: string;
}) {
  return (
    <SalesWorkspace projectId={projectId} section="inventory">
      {(c) => <UnitDetail key={unitId} c={c} id={unitId} />}
    </SalesWorkspace>
  );
}
