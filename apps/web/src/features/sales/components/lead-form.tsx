"use client";
import {
  LEAD_PRIORITIES,
  LEAD_SOURCES,
  BROCHURE_MAX_SELECTION,
  type LeadSource,
  type LeadPriority,
} from "@nirman-app/shared";
import { useQuery } from "@tanstack/react-query";
import { projectsService } from "@/features/projects/services/projects.service";
import { organizationsService } from "@/features/organizations/services/organizations.service";
import type { SalesContext } from "./sales-workspace";
import type { LeadInput, SalesLead } from "../types/sales.types";
import { salesKey, localTime } from "../sales-rules";
import { salesService } from "../services/sales.service";
import { SalesForm, type Field } from "./sales-form";
import { brochuresService } from "../services/brochures.service";
export function useAssignees(c: SalesContext) {
  return useQuery({
    queryKey: [...salesKey(c.org, c.project), "assignees", c.permissions],
    enabled: c.permissions.includes("project-members:read"),
    queryFn: async () => {
      const members = await projectsService.members(c.org, c.project);
      const today = localTime(new Date().toISOString(), c.timezone).slice(
        0,
        10,
      );
      const choices = members
        .filter(
          (m) =>
            m.status === "ACTIVE" &&
            (!m.startsOn || m.startsOn <= today) &&
            (!m.endsOn || m.endsOn >= today),
        )
        .map((m) => ({ value: m.user.id, label: m.user.name }));
      if (c.permissions.includes("members:read")) {
        const org = await organizationsService.members(c.org);
        for (const m of org.filter(
          (m) => m.status === "ACTIVE" && m.organizationWideProjectAccess,
        ))
          if (!choices.some((v) => v.value === m.userId))
            choices.push({ value: m.userId, label: m.user?.name ?? m.userId });
      }
      return choices;
    },
  });
}
export function assigneeField(
  options: { value: string; label: string }[] | undefined,
  name: string,
  required = false,
): Field {
  return {
    name,
    label: "Assigned user",
    type: "uuid",
    required,
    ...(options?.length
      ? { options }
      : {
          help: "Enter the user's ID if your role cannot list project members. The server validates active project eligibility.",
        }),
  };
}
export function LeadForm({
  c,
  lead,
  save,
  close,
  refresh,
}: {
  c: SalesContext;
  lead?: SalesLead;
  save: (input: LeadInput) => Promise<void>;
  close: () => void;
  refresh: () => Promise<unknown>;
}) {
  const assignees = useAssignees(c);
  const units = useQuery({
    queryKey: [...salesKey(c.org, c.project), "units"],
    queryFn: ({ signal }) => salesService.units(c.org, c.project, signal),
    enabled: c.permissions.includes("inventory:read"),
  });
  const brochures = useQuery({
    queryKey: ["brochures", c.org, c.project, "lead-picker"],
    queryFn: ({ signal }) => brochuresService.list(c.org, c.project, signal),
    enabled: !lead && c.permissions.includes("brochures:share"),
  });
  const fields: Field[] = (
    [
      {
        name: "customerName",
        label: "Customer name",
        required: true,
        minLength: 2,
        maxLength: 160,
      },
      {
        name: "primaryMobile",
        label: "Primary mobile",
        required: true,
        minLength: 7,
        maxLength: 24,
        type: "tel",
      },
      {
        name: "alternateMobile",
        label: "Alternate mobile",
        minLength: 7,
        maxLength: 24,
        type: "tel",
      },
      { name: "email", label: "Email", type: "email", maxLength: 190 },
      ...(!lead &&
      c.permissions.includes("brochures:share") &&
      (brochures.data?.items.length ?? 0) > 0
        ? [
            {
              name: "sendBrochures",
              label: "Send marketing brochures to this email",
              type: "checkbox",
            },
            {
              name: "brochureAssetIds",
              label: "Brochures",
              type: "multi-checkbox",
              options: brochures.data!.items.map((asset) => ({
                value: asset.id,
                label: `${asset.title} · ${(asset.byteSize / 1024 / 1024).toFixed(1)} MiB`,
              })),
              showWhen: { field: "sendBrochures", value: "true" },
              requiredWhen: { field: "sendBrochures", value: "true" },
              help: "A private 30-day link will be sent after the lead is saved.",
            },
          ]
        : []),
      {
        name: "preferredUnitType",
        label: "Preferred unit type",
        maxLength: 80,
      },
      {
        name: "budgetMin",
        label: "Minimum budget (₹)",
        numeric: {
          kind: "decimal",
          min: 0,
          message: "Enter zero or a positive number.",
        },
      },
      {
        name: "budgetMax",
        label: "Maximum budget (₹)",
        numeric: {
          kind: "decimal",
          min: 0,
          message: "Enter zero or a positive number.",
        },
      },
      { name: "purchasePurpose", label: "Purchase purpose", maxLength: 120 },
      { name: "purchaseTimeline", label: "Purchase timeline", maxLength: 120 },
      {
        name: "source",
        label: "Source",
        options: LEAD_SOURCES,
        required: true,
        initial: "WALK_IN",
      },
      { name: "sourceDetail", label: "Source detail", maxLength: 255 },
      {
        name: "priority",
        label: "Priority",
        options: LEAD_PRIORITIES,
        initial: "MEDIUM",
      },
      ...(units.data
        ? [
            {
              name: "interestedUnitId",
              label: "Interested unit",
              options: units.data.map((u) => ({
                value: u.id,
                label: `${u.unitNumber} · ${u.status}`,
              })),
            },
          ]
        : []),
      ...(!lead && c.permissions.includes("leads:assign")
        ? [assigneeField(assignees.data, "assignedTo")]
        : []),
    ] satisfies Field[]
  ).map((f) => ({
    ...f,
    initial:
      lead && f.name in lead
        ? String(lead[f.name as keyof SalesLead] ?? "")
        : f.initial,
  }));
  return (
    <SalesForm
      title={lead ? "Edit lead" : "Create lead"}
      fields={fields}
      close={close}
      refresh={refresh}
      validate={(v) => {
        const min = v.budgetMin ? Number(v.budgetMin) : lead?.budgetMin;
        const max = v.budgetMax ? Number(v.budgetMax) : lead?.budgetMax;
        const errors: Record<string, string> = {};
        if (min != null && max != null && max < min)
          errors.budgetMax =
            "Maximum budget must be at least the minimum budget.";
        if (v.sendBrochures === "true" && !v.email)
          errors.email = "Email is required when sharing brochures.";
        if (v.sendBrochures === "true" && !v.brochureAssetIds)
          errors.brochureAssetIds = "Select at least one brochure.";
        if (
          v.brochureAssetIds?.split(",").filter(Boolean).length >
          BROCHURE_MAX_SELECTION
        )
          errors.brochureAssetIds = `Select up to ${BROCHURE_MAX_SELECTION} brochures.`;
        return errors;
      }}
      save={async (v) => {
        const input: LeadInput = {
          customerName: v.customerName.trim(),
          primaryMobile: v.primaryMobile.trim(),
          source: v.source as LeadSource,
        };
        for (const name of [
          "alternateMobile",
          "email",
          "preferredUnitType",
          "purchasePurpose",
          "purchaseTimeline",
          "sourceDetail",
          "assignedTo",
          "interestedUnitId",
        ] as const)
          if (v[name]?.trim()) input[name] = v[name].trim();
        if (v.priority) input.priority = v.priority as LeadPriority;
        if (v.budgetMin !== "") input.budgetMin = Number(v.budgetMin);
        if (v.budgetMax !== "") input.budgetMax = Number(v.budgetMax);
        if (!lead && v.sendBrochures === "true" && v.brochureAssetIds)
          input.brochureShare = {
            assetIds: v.brochureAssetIds.split(",").filter(Boolean),
          };
        await save(input);
      }}
    />
  );
}
