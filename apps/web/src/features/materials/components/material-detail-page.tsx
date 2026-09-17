"use client";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { Button, Card, LoadingState } from "@/components/ui";
import { useMaterialDetail } from "../hooks/use-materials";
import { label, materialActions } from "../material-rules";
import type { MaterialAction } from "../types/materials.types";
import { MaterialForm } from "./material-form";
import {
  MaterialsWorkspace,
  type MaterialsContext,
} from "./materials-workspace";
import { date, Facts, Failure, MaterialStatus, money } from "./materials-ui";

export function MaterialDetailPage({
  projectId,
  id,
}: {
  projectId: string;
  id: string;
}) {
  return (
    <Suspense fallback={<LoadingState label="Loading material request" />}>
      <MaterialsWorkspace projectId={projectId}>
        {(context) => <Detail key={id} context={context} id={id} />}
      </MaterialsWorkspace>
    </Suspense>
  );
}
function Detail({ context, id }: { context: MaterialsContext; id: string }) {
  const query = useMaterialDetail(context.org, context.project, id);
  const search = useSearchParams();
  const [action, setAction] = useState<MaterialAction | null>(null);
  const [notice, setNotice] = useState(
    search.get("created") === "1"
      ? "Draft created. Review it and submit when ready."
      : "",
  );
  const refresh = async () => {
    const result = await query.refetch();
    return result.isError ? undefined : result.data;
  };
  if (query.isPending) return <LoadingState label="Loading material request" />;
  // Never offer cached actions after authorization or refresh errors.
  if (query.isError && !action)
    return <Failure error={query.error} retry={() => void query.refetch()} />;
  if (!query.data)
    return (
      <Failure
        error={query.error ?? new Error("Request unavailable")}
        retry={() => void query.refetch()}
      />
    );
  const d = query.data;
  const actions = materialActions(
    d.availableActions,
    context.permissions,
    context.active && !query.isError,
  );
  const unit = d.customUnitLabel ?? label(d.unitOfMeasure);
  return (
    <div className="space-y-5">
      <Link
        className="underline"
        href={`/projects/${context.project}/materials`}
      >
        Back to Materials
      </Link>
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm text-sub">{d.category ?? "Uncategorized"}</p>
          <h1 className="break-words text-2xl font-semibold">
            {d.materialName}
          </h1>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <MaterialStatus status={d.status} />
          <Button
            variant="outline"
            disabled={query.isFetching}
            onClick={() => void query.refetch()}
          >
            {query.isFetching ? "Refreshing…" : "Refresh"}
          </Button>
        </div>
      </header>
      {notice && (
        <p role="status" className="text-success">
          {notice}
        </p>
      )}
      {query.isError && (
        <Failure error={query.error} retry={() => void query.refetch()} />
      )}
      <div className="grid gap-5 xl:grid-cols-2">
        <Card className="space-y-4">
          <h2 className="text-lg font-semibold">Request</h2>
          <Facts
            rows={[
              ["Requested by", d.requestedBy],
              ["Requested on", date(d.requestedOn)],
              ["Required by", date(d.requiredByDate)],
              ["Quantity", `${d.requestedQuantity} ${unit}`],
              ["Estimated cost", money(d.estimatedCost)],
              ["Workflow", label(d.workflowMode)],
              [
                "Responsible member",
                d.responsibleContractorMemberId ?? "Unassigned",
              ],
              ["Version", d.version],
            ]}
          />
          {d.notes && (
            <p className="whitespace-pre-wrap break-words">{d.notes}</p>
          )}
        </Card>
        <Card className="space-y-4">
          <h2 className="text-lg font-semibold">Fulfilment</h2>
          <Facts
            rows={[
              ["Ordered", `${d.orderedQuantity} ${unit}`],
              ["Delivered", `${d.deliveredQuantity} ${unit}`],
              ["Remaining", `${d.remainingQuantity} ${unit}`],
              ["Purchase cost", money(d.totalPurchaseCost)],
            ]}
          />
          <div className="flex flex-wrap gap-2">
            {actions.map((a) => (
              <Button
                key={a}
                variant="outline"
                disabled={query.isFetching}
                onClick={() => setAction(a as MaterialAction)}
              >
                {label(a)}
              </Button>
            ))}
          </div>
          {!actions.length && (
            <p className="text-sub">No actions available for this request.</p>
          )}
        </Card>
      </div>
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">
          Purchases ({d.purchases.length})
        </h2>
        {!d.purchases.length && <Card>No purchases recorded.</Card>}
        <div className="grid gap-3 lg:grid-cols-2">
          {d.purchases.map((p) => (
            <Card key={p.id} className="space-y-3">
              <h3 className="font-semibold">
                {p.vendorName ?? "Purchase"} · {p.orderedQuantity} {unit}
              </h3>
              <Facts
                rows={[
                  ["Purchased on", date(p.purchasedOn)],
                  ["Order reference", p.orderReference],
                  ["Unit cost", money(p.unitCost)],
                  ["Total cost", money(p.totalCost)],
                  ["Recorded by", p.recordedBy],
                ]}
              />
              {p.notes && (
                <p className="whitespace-pre-wrap break-words">{p.notes}</p>
              )}
            </Card>
          ))}
        </div>
      </section>
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">
          Deliveries ({d.deliveries.length})
        </h2>
        {!d.deliveries.length && <Card>No deliveries recorded.</Card>}
        <div className="grid gap-3 lg:grid-cols-2">
          {d.deliveries.map((delivery) => {
            const purchase = d.purchases.find(
              (p) => p.id === delivery.materialPurchaseId,
            );
            return (
              <Card key={delivery.id} className="space-y-3">
                <h3 className="font-semibold">
                  {delivery.deliveredQuantity} {unit} ·{" "}
                  {date(delivery.deliveredOn)}
                </h3>
                <Facts
                  rows={[
                    ["Delivery reference", delivery.deliveryReference],
                    ["Recorded by", delivery.recordedBy],
                    [
                      "Purchase",
                      purchase
                        ? `${purchase.vendorName ?? "Purchase"} · ${purchase.orderReference ?? purchase.purchasedOn}`
                        : "No specific purchase",
                    ],
                  ]}
                />
                {delivery.notes && (
                  <p className="whitespace-pre-wrap break-words">
                    {delivery.notes}
                  </p>
                )}
              </Card>
            );
          })}
        </div>
      </section>
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Timeline</h2>
        <ol className="space-y-3">
          {d.events.map((e) => (
            <li key={e.id}>
              <Card className="space-y-2">
                <div className="flex flex-wrap justify-between gap-2">
                  <h3 className="font-semibold">{label(e.eventType)}</h3>
                  <time className="text-sm text-sub" dateTime={e.createdAt}>
                    {new Intl.DateTimeFormat("en-IN", {
                      dateStyle: "medium",
                      timeStyle: "short",
                      timeZone: context.timezone,
                    }).format(new Date(e.createdAt))}
                  </time>
                </div>
                <p>
                  {e.actorName} ·{" "}
                  {e.previousStatus ? `${label(e.previousStatus)} → ` : ""}
                  {label(e.nextStatus)}
                </p>
                {e.comment && (
                  <p className="whitespace-pre-wrap break-words">{e.comment}</p>
                )}
              </Card>
            </li>
          ))}
        </ol>
      </section>
      {action && (
        <MaterialForm
          context={context}
          action={action}
          detail={d}
          close={() => setAction(null)}
          refresh={refresh}
          saved={() => {
            setNotice(`${label(action)} saved successfully.`);
            setAction(null);
          }}
        />
      )}
    </div>
  );
}
