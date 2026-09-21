"use client";
import Link from "next/link";
import { useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button, Card, LoadingState } from "@/components/ui";
import type { SalesContext } from "./sales-workspace";
import type { SalesLead } from "../types/sales.types";
import { Failure, Status } from "./sales-ui";
import { SalesForm } from "./sales-form";
import { inventoryService } from "../services/inventory.service";
import { salesService } from "../services/sales.service";
import { canWriteLead, salesKey } from "../sales-rules";
import { openUnit } from "../inventory-rules";
import { useSalesLifetime } from "../hooks/use-sales";
export function LeadInventory({
  c,
  lead,
}: {
  c: SalesContext;
  lead: SalesLead;
}) {
  const cache = useQueryClient();
  const live = useSalesLifetime();
  const [action, setAction] = useState<"interest" | "request" | null>(null);
  const [success, setSuccess] = useState("");
  const snapshot = useRef(lead.updatedAt);
  const interests = useQuery({
    queryKey: [...salesKey(c.org, c.project), "lead-interests", lead.id],
    queryFn: ({ signal }) =>
      inventoryService.leadInterests(c.org, c.project, lead.id, signal),
  });
  const units = useQuery({
    queryKey: [...salesKey(c.org, c.project), "inventory", {}],
    queryFn: ({ signal }) =>
      inventoryService.units(c.org, c.project, {}, signal),
    enabled: action !== null,
  });
  const canWrite =
    canWriteLead(c.permissions, c.active, "leads:update", lead, c.user) &&
    lead.currentStage !== "BOOKED";
  async function refresh() {
    const current = await salesService.lead(c.org, c.project, lead.id);
    snapshot.current = current.updatedAt;
    await cache.invalidateQueries({ queryKey: salesKey(c.org, c.project) });
  }
  const candidates = (interests.data ?? []).filter(
    (i) =>
      i.status !== "WITHDRAWN" &&
      !i.holdRequestId &&
      units.data?.some((u) => u.id === i.unitId && openUnit(u.status)),
  );
  return (
    <section className="space-y-3">
      <h2 className="text-xl font-semibold">Unit interests and holds</h2>
      {success && <p role="status">{success}</p>}
      <div className="flex flex-wrap gap-3">
        {canWrite && c.permissions.includes("inventory:interest") && (
          <Button
            variant="outline"
            onClick={() => {
              snapshot.current = lead.updatedAt;
              setAction("interest");
            }}
          >
            Record unit interest
          </Button>
        )}
        {canWrite && c.permissions.includes("inventory:request-block") && (
          <Button
            variant="outline"
            onClick={() => {
              snapshot.current = lead.updatedAt;
              setAction("request");
            }}
          >
            Request unit hold
          </Button>
        )}
        <Link
          className="underline"
          href={`/projects/${c.project}/sales/inventory`}
        >
          View inventory
        </Link>
      </div>
      {interests.isPending ? (
        <LoadingState label="Loading interests" />
      ) : interests.isError ? (
        <Failure
          error={interests.error}
          retry={() => void interests.refetch()}
        />
      ) : !interests.data.length ? (
        <Card>No unit interests recorded.</Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {interests.data.map((i) => (
            <Card key={i.id}>
              <Link
                className="font-semibold underline"
                href={`/projects/${c.project}/sales/inventory/${i.unitId}`}
              >
                {i.unitNumber}
              </Link>
              <div className="mt-2">
                <Status value={i.status} />
                {i.holdRequestId && <p>Hold approval pending</p>}
              </div>
              {i.notes && <p className="whitespace-pre-wrap">{i.notes}</p>}
            </Card>
          ))}
        </div>
      )}
      {action && (
        <SalesForm
          title={
            action === "interest" ? "Record unit interest" : "Request unit hold"
          }
          fields={[
            {
              name: "unitId",
              label: "Unit",
              required: true,
              options:
                action === "interest"
                  ? (units.data ?? [])
                      .filter((u) => openUnit(u.status))
                      .map((u) => ({
                        value: u.id,
                        label: `${u.unitNumber} · ${u.unitType} · ${u.status}`,
                      }))
                  : candidates.map((i) => ({
                      value: i.unitId,
                      label: `${i.unitNumber} · ${i.status}`,
                    })),
            },
            ...(action === "interest"
              ? [
                  {
                    name: "status",
                    label: "Interest level",
                    required: true,
                    options: ["INTERESTED", "HIGH_INTENT", "WITHDRAWN"],
                    initial: "INTERESTED",
                  },
                ]
              : []),
            {
              name: "notes",
              label: "Notes",
              type: "textarea",
              maxLength: 2000,
            },
          ]}
          close={() => setAction(null)}
          refresh={refresh}
          validate={() =>
            units.isSuccess && interests.isSuccess
              ? {}
              : { unitId: "Wait for current inventory and interests to load." }
          }
          save={async (v) => {
            const current = await salesService.lead(c.org, c.project, lead.id);
            if (!live.current) return;
            if (
              current.updatedAt !== snapshot.current ||
              !canWriteLead(
                c.permissions,
                c.active,
                "leads:update",
                current,
                c.user,
              ) ||
              current.currentStage === "BOOKED"
            )
              throw new Error(
                "The lead changed. Refresh and review before submitting.",
              );
            const available = (
              await inventoryService.units(c.org, c.project)
            ).find((u) => u.id === v.unitId);
            if (!available || !openUnit(available.status))
              throw new Error(
                "This unit is no longer available for interest or holds.",
              );
            if (action === "request") {
              const currentInterests = await inventoryService.leadInterests(
                c.org,
                c.project,
                lead.id,
              );
              if (
                !currentInterests.some(
                  (i) =>
                    i.unitId === v.unitId &&
                    i.status !== "WITHDRAWN" &&
                    !i.holdRequestId,
                )
              )
                throw new Error(
                  "The interest or hold request changed. Refresh before requesting again.",
                );
            }
            if (!live.current) return;
            if (action === "interest")
              await inventoryService.interest(c.org, c.project, v.unitId, {
                leadId: lead.id,
                status: v.status as "INTERESTED" | "HIGH_INTENT" | "WITHDRAWN",
                notes: v.notes || undefined,
              });
            else
              await inventoryService.request(c.org, c.project, v.unitId, {
                leadId: lead.id,
                notes: v.notes || undefined,
              });
            if (!live.current) return;
            setAction(null);
            setSuccess(
              "Saved. The lead history and inventory have been refreshed.",
            );
            await cache.invalidateQueries({
              queryKey: salesKey(c.org, c.project),
            });
          }}
        >
          {units.isPending ? (
            <LoadingState label="Loading units" />
          ) : units.isError ? (
            <Failure error={units.error} retry={() => void units.refetch()} />
          ) : (
            <p>
              {action === "interest"
                ? "Interest does not reserve inventory."
                : "Choose an active interest without a pending hold. Approval is required to reserve a unit."}
            </p>
          )}
        </SalesForm>
      )}
    </section>
  );
}
