"use client";
import Link from "next/link";
import { Suspense, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import {
  FOLLOW_UP_TYPES,
  LEAD_STAGES,
  type FollowUpType,
  type LeadStage,
} from "@nirman-app/shared";
import { Button, Card, LoadingState } from "@/components/ui";
import { useActivities, useLead, useSalesLifetime } from "../hooks/use-sales";
import {
  assignmentPermission,
  canWriteLead,
  instant,
  label,
  salesKey,
} from "../sales-rules";
import { salesService } from "../services/sales.service";
import { SalesWorkspace, type SalesContext } from "./sales-workspace";
import { Failure, Status, dateTime, money } from "./sales-ui";
import { LeadForm, assigneeField, useAssignees } from "./lead-form";
import { SalesForm } from "./sales-form";
import type {
  SalesLead,
  ActivityInput,
  SiteVisitInput,
} from "../types/sales.types";
import { SiteVisitForm } from "./site-visit-form";
import { BookingCreate } from "./booking-create";
import { LeadInventory } from "./lead-inventory";
import { safeLeadReturn, salesDetailUrl } from "../sales-view";
function LeadDetail({
  c,
  id,
  created,
}: {
  c: SalesContext;
  id: string;
  created?: boolean;
}) {
  const live = useSalesLifetime();
  const returnTo = safeLeadReturn(useSearchParams().get("returnTo"), c.project);
  const lead = useLead(c.org, c.project, id);
  const activities = useActivities(c.org, c.project, id, lead.isSuccess);
  const assignees = useAssignees(c);
  const cache = useQueryClient();
  const [dialog, setDialog] = useState<
    "edit" | "stage" | "assign" | "activity" | "follow-up" | "visit" | null
  >(null);
  const [success, setSuccess] = useState(
    created ? "Lead created successfully." : "",
  );
  const snapshot = useRef<SalesLead | null>(null);
  async function refresh() {
    const current = await salesService.lead(c.org, c.project, id);
    snapshot.current = current;
    cache.setQueryData([...salesKey(c.org, c.project), "lead", id], current);
    await cache.invalidateQueries({ queryKey: salesKey(c.org, c.project) });
  }
  async function execute(write: () => Promise<unknown>) {
    const current = await salesService.lead(c.org, c.project, id);
    if (!live.current) return;
    if (
      !snapshot.current ||
      current.updatedAt !== snapshot.current.updatedAt ||
      current.assignedTo !== snapshot.current.assignedTo ||
      current.currentStage !== snapshot.current.currentStage
    )
      throw new Error(
        "This lead changed since you opened the form. Refresh and review before saving.",
      );
    await write();
    if (!live.current) return;
    setDialog(null);
    setSuccess("Saved successfully.");
    void cache.invalidateQueries({ queryKey: salesKey(c.org, c.project) });
  }
  if (lead.isPending) return <LoadingState label="Loading lead" />;
  if (lead.isError)
    return <Failure error={lead.error} retry={() => void lead.refetch()} />;
  const l = lead.data;
  const can = (permission: string) =>
    canWriteLead(c.permissions, c.active, permission, l, c.user);
  function open(value: typeof dialog) {
    snapshot.current = l;
    setDialog(value);
  }
  const rows = [
    ["Source", label(l.source)],
    ["Source detail", l.sourceDetail],
    ["Priority", label(l.priority)],
    ["Created by", l.createdByName ?? l.createdBy],
    ["Preferred unit type", l.preferredUnitType],
    ["Interested unit", l.interestedUnitNumber ?? l.interestedUnitId],
    ["Minimum budget", money(l.budgetMin)],
    ["Maximum budget", money(l.budgetMax)],
    ["Purchase purpose", l.purchasePurpose],
    ["Purchase timeline", l.purchaseTimeline],
    ["Lost reason", l.lostReason],
    ["Created", dateTime(l.createdAt, c.timezone)],
    ["Updated", dateTime(l.updatedAt, c.timezone)],
    ["Converted", dateTime(l.convertedAt, c.timezone)],
    ["Converted by", l.convertedBy],
  ];
  return (
    <div className="space-y-5">
      <Link className="underline" href={returnTo}>
        Back to {returnTo.includes("/follow-ups") ? "follow-ups" : returnTo.includes("/site-visits") ? "site visits" : returnTo.includes("/inventory/") ? "unit" : returnTo.includes("/bookings/") ? "booking" : "leads"}
      </Link>
      <header className="flex flex-wrap justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold break-words">
            {l.customerName}
          </h1>
          <Status value={l.currentStage} />
        </div>
        <Button
          variant="outline"
          onClick={() =>
            void cache.invalidateQueries({
              queryKey: salesKey(c.org, c.project),
            })
          }
        >
          Refresh
        </Button>
      </header>
      {success && <p role="status">{success}</p>}
      <Card className="space-y-3">
        <h2 className="text-lg font-semibold">Customer and owner</h2>
        <dl className="grid gap-4 sm:grid-cols-3">
          {[["Primary mobile", l.primaryMobile], ["Alternate mobile", l.alternateMobile], ["Email", l.email], ["Owner", l.assignedToName ?? l.assignedTo]].map(([name, value]) => (
            <div key={name}><dt className="text-sm text-sub">{name}</dt><dd className="break-words font-medium">{value || "Not provided"}</dd></div>
          ))}
        </dl>
      </Card>
      <section className="space-y-3" aria-label="Customer actions">
        <h2 className="text-lg font-semibold">Next actions</h2>
        <div className="flex flex-wrap gap-3">
        <BookingCreate c={c} lead={l} returnTo={salesDetailUrl(`/projects/${c.project}/sales/leads/${id}`, returnTo)} />
        {can("site-visits:manage") && (
          <Button variant="outline" onClick={() => open("visit")}>
            Schedule site visit
          </Button>
        )}
        {can("leads:update") && (
          <>
            <Button variant="outline" onClick={() => open("activity")}>
              Record activity
            </Button>
          </>
        )}
        {can("followups:manage") && (
          <Button variant="outline" onClick={() => open("follow-up")}>
            Schedule follow-up
          </Button>
        )}
        </div>
      </section>
      <section className="space-y-3" aria-label="Lead administration">
        <h2 className="text-lg font-semibold">Lead administration</h2>
        <div className="flex flex-wrap gap-3">
          {can("leads:update") && <><Button variant="outline" onClick={() => open("edit")}>Edit lead</Button><Button variant="outline" onClick={() => open("stage")}>Change stage</Button></>}
          {c.active && c.permissions.includes(assignmentPermission(l.assignedTo)) && <Button variant="outline" onClick={() => open("assign")}>{l.assignedTo ? "Reassign lead" : "Assign lead"}</Button>}
        </div>
      </section>
      <Card className="space-y-3">
        <h2 className="text-lg font-semibold">Lead preferences and history</h2>
        <dl className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {rows.map(([name, value]) => (
            <div key={name} className="min-w-0">
              <dt className="text-sm text-sub">{name}</dt>
              <dd className="whitespace-pre-wrap break-words">
                {value || "Not provided"}
              </dd>
            </div>
          ))}
        </dl>
      </Card>
      {c.permissions.includes("inventory:read") && <LeadInventory c={c} lead={l} />}
      <section className="space-y-3" aria-labelledby="timeline">
        <h2 id="timeline" className="text-xl font-semibold">
          Activity timeline
        </h2>
        {activities.isPending ? (
          <LoadingState label="Loading activity history" />
        ) : activities.isError ? (
          <Failure
            error={activities.error}
            retry={() => void activities.refetch()}
          />
        ) : (
          <>
            {!activities.data.length && <Card>No activities yet.</Card>}
            <ol className="space-y-3">
              {activities.data.map((a) => (
                <li key={a.id}>
                  <Card>
                    <p className="font-semibold">{a.summary}</p>
                    <p className="text-sm text-sub">
                      {label(a.activityType)} · {a.actorName ?? a.actorId} ·{" "}
                      {dateTime(a.occurredAt, c.timezone)}
                    </p>
                    {a.details != null && (
                      <details className="mt-2">
                        <summary className="cursor-pointer">
                          Activity details
                        </summary>
                        <pre className="mt-2 whitespace-pre-wrap break-words font-sans text-sm">
                          {typeof a.details === "string"
                            ? a.details
                            : JSON.stringify(a.details, null, 2)}
                        </pre>
                      </details>
                    )}
                  </Card>
                </li>
              ))}
            </ol>
          </>
        )}
      </section>
      {dialog === "visit" && (
        <SiteVisitForm
          c={c}
          close={() => setDialog(null)}
          refresh={refresh}
          save={(input) =>
            execute(() =>
              salesService.createSiteVisit(
                c.org,
                c.project,
                id,
                input as SiteVisitInput,
              ),
            )
          }
        />
      )}
      {dialog === "edit" && (
        <LeadForm
          c={c}
          lead={l}
          close={() => setDialog(null)}
          refresh={refresh}
          save={(input) =>
            execute(() => salesService.updateLead(c.org, c.project, id, input))
          }
        />
      )}
      {dialog === "stage" && (
        <SalesForm
          title="Change lead stage"
          fields={[
            {
              name: "currentStage",
              label: "Stage",
              required: true,
              options: LEAD_STAGES.filter((s) => s !== "BOOKED"),
              initial: l.currentStage === "BOOKED" ? "" : l.currentStage,
              help: "Booked is set only by booking confirmation.",
            },
            {
              name: "lostReason",
              label: "Lost reason",
              type: "textarea",
              maxLength: 2000,
              initial: l.lostReason ?? "",
              help: "Required when marking the lead Lost.",
            },
          ]}
          validate={(v) =>
            v.currentStage === "LOST" && !v.lostReason.trim()
              ? { lostReason: "Enter a lost reason." }
              : {}
          }
          close={() => setDialog(null)}
          refresh={refresh}
          save={(v) =>
            execute(() =>
              salesService.updateLead(c.org, c.project, id, {
                currentStage: v.currentStage as LeadStage,
                ...(v.currentStage === "LOST"
                  ? { lostReason: v.lostReason.trim() }
                  : {}),
              }),
            )
          }
        />
      )}
      {dialog === "assign" && (
        <SalesForm
          title={l.assignedTo ? "Reassign lead" : "Assign lead"}
          fields={[assigneeField(assignees.data, "assignedTo", true)]}
          close={() => setDialog(null)}
          refresh={refresh}
          save={(v) =>
            execute(() =>
              salesService.assign(c.org, c.project, id, v.assignedTo),
            )
          }
        />
      )}
      {dialog === "activity" && (
        <SalesForm
          title="Record activity"
          fields={[
            {
              name: "activityType",
              label: "Activity",
              required: true,
              options: ["CALL_OUTCOME", "NOTE_ADDED", "BROCHURE_SHARED"],
              initial: "NOTE_ADDED",
            },
            {
              name: "summary",
              label: "Summary",
              required: true,
              maxLength: 255,
            },
            {
              name: "details",
              label: "Details",
              type: "textarea",
              maxLength: 4000,
            },
          ]}
          close={() => setDialog(null)}
          refresh={refresh}
          save={(v) =>
            execute(() =>
              salesService.addActivity(c.org, c.project, id, {
                activityType: v.activityType as ActivityInput["activityType"],
                summary: v.summary.trim(),
                details: v.details || undefined,
              }),
            )
          }
        />
      )}
      {dialog === "follow-up" && (
        <SalesForm
          title="Schedule follow-up"
          timezone={c.timezone}
          fields={[
            {
              name: "scheduledAt",
              label: `Scheduled time (${c.timezone})`,
              type: "datetime-local",
              required: true,
            },
            {
              name: "type",
              label: "Follow-up type",
              required: true,
              options: FOLLOW_UP_TYPES,
              initial: "PHONE",
            },
            {
              ...assigneeField(assignees.data, "assignedUserId"),
              help: "Leave blank to use the lead assignee, or yourself if unassigned.",
            },
            {
              name: "notes",
              label: "Notes",
              type: "textarea",
              maxLength: 4000,
            },
          ]}
          close={() => setDialog(null)}
          refresh={refresh}
          save={(v) =>
            execute(() =>
              salesService.createFollowUp(c.org, c.project, id, {
                scheduledAt: instant(v.scheduledAt, c.timezone),
                type: v.type as FollowUpType,
                assignedUserId: v.assignedUserId || undefined,
                notes: v.notes || undefined,
              }),
            )
          }
        />
      )}
    </div>
  );
}
export function LeadDetailPage({
  projectId,
  leadId,
  created,
}: {
  projectId: string;
  leadId: string;
  created?: boolean;
}) {
  return (
    <Suspense fallback={<LoadingState label="Loading lead" />}>
      <SalesWorkspace projectId={projectId} section="leads">
        {(c) => <LeadDetail key={leadId} c={c} id={leadId} created={created} />}
      </SalesWorkspace>
    </Suspense>
  );
}
