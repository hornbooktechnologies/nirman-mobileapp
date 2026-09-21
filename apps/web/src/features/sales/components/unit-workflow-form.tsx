"use client";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button, Input, LoadingState } from "@/components/ui";
import { SalesForm, type Field } from "./sales-form";
import { Failure } from "./sales-ui";
import type { SalesContext } from "./sales-workspace";
import type { SalesUnitInterest } from "../types/inventory.types";
import { salesService } from "../services/sales.service";
import { canWriteLead, instant, salesKey } from "../sales-rules";
export type UnitAction =
  "interest" | "request" | "block" | "release" | "APPROVED" | "REJECTED";
export type WorkflowValues = {
  leadId?: string;
  status?: "INTERESTED" | "HIGH_INTENT" | "WITHDRAWN";
  notes?: string;
  expiresAt?: string;
};
export function UnitWorkflowForm({
  c,
  action,
  interest,
  close,
  refresh,
  save,
}: {
  c: SalesContext;
  action: UnitAction;
  interest?: SalesUnitInterest;
  close: () => void;
  refresh: () => Promise<unknown>;
  save: (v: WorkflowValues) => Promise<void>;
}) {
  const [search, setSearch] = useState("");
  const [term, setTerm] = useState("");
  const [page, setPage] = useState(1);
  const pickLead = (action === "interest" || action === "block") && !interest;
  useEffect(() => {
    const timer = setTimeout(() => setTerm(search), 300);
    return () => clearTimeout(timer);
  }, [search]);
  const leads = useQuery({
    queryKey: [...salesKey(c.org, c.project), "inventory-leads", term, page],
    queryFn: ({ signal }) =>
      salesService.leads(
        c.org,
        c.project,
        { search: term, page, limit: 50 },
        signal,
      ),
    enabled: pickLead,
  });
  const titles: Record<UnitAction, string> = {
    interest: "Record interest",
    request: "Request hold",
    block: "Block unit",
    release: "Release active block",
    APPROVED: "Approve hold",
    REJECTED: "Reject hold",
  };
  const fields: Field[] = [
    ...(pickLead
      ? [
          {
            name: "leadId",
            label: "Customer lead",
            required: true,
            options: (leads.data?.data ?? [])
              .filter(
                (l) =>
                  l.currentStage !== "BOOKED" &&
                  canWriteLead(
                    c.permissions,
                    c.active,
                    "leads:update",
                    l,
                    c.user,
                  ),
              )
              .map((l) => ({
                value: l.id,
                label: `${l.customerName} · ${l.primaryMobile}`,
              })),
          },
        ]
      : []),
    ...(action === "interest"
      ? [
          {
            name: "status",
            label: "Interest level",
            required: true,
            options: ["INTERESTED", "HIGH_INTENT", "WITHDRAWN"],
            initial:
              interest &&
              ["INTERESTED", "HIGH_INTENT", "WITHDRAWN"].includes(
                interest.status,
              )
                ? interest.status
                : "INTERESTED",
          },
        ]
      : []),
    ...(["APPROVED", "block"].includes(action)
      ? [
          {
            name: "expiresAt",
            label: `Block expiry (${c.timezone})`,
            type: "datetime-local",
            help: "Leave blank for the server’s 24-hour default.",
          },
        ]
      : []),
    ...(action !== "release"
      ? [
          {
            name: "notes",
            label: "Notes",
            type: "textarea",
            maxLength: 2000,
            initial: action === "interest" ? (interest?.notes ?? "") : "",
          },
        ]
      : []),
  ];
  return (
    <>
      <SalesForm
        title={`${titles[action]}${interest ? ` · ${interest.customerName}` : ""}`}
        fields={fields}
        timezone={c.timezone}
        close={close}
        refresh={refresh}
        validate={(v) => {
          const errors: Record<string, string> = {};
          if (
            pickLead &&
            (!leads.isSuccess ||
              !leads.data.data.some((l) => l.id === v.leadId))
          )
            errors.leadId = "Choose a lead from the current results.";
          if (v.expiresAt) {
            try {
              if (
                new Date(instant(v.expiresAt, c.timezone)).getTime() <=
                Date.now()
              )
                errors.expiresAt = "Choose a future expiry.";
            } catch {
              errors.expiresAt =
                "Enter a valid expiry in the working timezone.";
            }
          }
          return errors;
        }}
        save={(v) =>
          save({
            leadId: interest?.leadId ?? v.leadId,
            status: v.status as WorkflowValues["status"],
            notes: v.notes || undefined,
            expiresAt: v.expiresAt
              ? instant(v.expiresAt, c.timezone)
              : undefined,
          })
        }
      >
        {pickLead && (
          <div className="space-y-3">
            <label>
              Find customer
              <Input
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
              />
            </label>
            <div className="flex items-center gap-3">
              <Button
                type="button"
                variant="outline"
                disabled={page <= 1 || leads.isFetching}
                onClick={() => setPage((p) => p - 1)}
              >
                Previous leads
              </Button>
              <span>Page {page}</span>
              <Button
                type="button"
                variant="outline"
                disabled={
                  leads.isFetching || page * 50 >= (leads.data?.meta.total ?? 0)
                }
                onClick={() => setPage((p) => p + 1)}
              >
                Next leads
              </Button>
            </div>
            {leads.isPending ? (
              <LoadingState label="Loading leads" />
            ) : leads.isError ? (
              <Failure error={leads.error} retry={() => void leads.refetch()} />
            ) : (
              !leads.data.data.length && <p>No matching leads.</p>
            )}
          </div>
        )}
        {action === "release" && (
          <p>
            Release this block and restore the lead’s previous stage? The server
            will make the unit available again.
          </p>
        )}
      </SalesForm>
    </>
  );
}
