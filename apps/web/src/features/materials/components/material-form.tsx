"use client";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { useQuery } from "@tanstack/react-query";
import { MATERIAL_UNITS, type MaterialRequestDetail } from "@nirman-app/shared";
import { Button, Dialog, Input, Select, Textarea } from "@/components/ui";
import { projectsService } from "@/features/projects/services/projects.service";
import { workToday, validDate } from "@/features/attendance/date-utils";
import { ApiError } from "@/lib/api/api-client";
import { useMaterialWrite } from "../hooks/use-materials";
import {
  decimalError,
  label,
  materialKey,
  retainAttempt,
  uncertainFailure,
} from "../material-rules";
import type { MaterialWrite } from "../services/materials.service";
import type { MaterialAction } from "../types/materials.types";
import type { MaterialsContext } from "./materials-workspace";

export function MaterialForm({
  context,
  action,
  detail,
  close,
  saved,
  refresh,
}: {
  context: MaterialsContext;
  action: MaterialAction | "CREATE";
  detail?: MaterialRequestDetail;
  close: () => void;
  saved: (record: MaterialRequestDetail) => void;
  refresh: () => Promise<MaterialRequestDetail | undefined>;
}) {
  const request = action === "CREATE" || action === "EDIT";
  const purchase = action === "RECORD_PURCHASE";
  const delivery = action === "RECORD_DELIVERY";
  const [values, setValues] = useState<Record<string, string>>(() => ({
    materialName: detail?.materialName ?? "",
    category: detail?.category ?? "",
    requestedQuantity: detail?.requestedQuantity ?? "",
    unitOfMeasure: detail?.unitOfMeasure ?? "BAG",
    customUnitLabel: detail?.customUnitLabel ?? "",
    requestedOn: detail?.requestedOn ?? workToday(context.timezone),
    requiredByDate: detail?.requiredByDate ?? "",
    estimatedCost: detail?.estimatedCost ?? "",
    responsibleContractorMemberId: detail?.responsibleContractorMemberId ?? "",
    notes: request ? (detail?.notes ?? "") : "",
    purchasedOn: workToday(context.timezone),
    deliveredOn: workToday(context.timezone),
  }));
  const [version, setVersion] = useState(detail?.version);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [dirty, setDirty] = useState(false);
  const [stale, setStale] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [denied, setDenied] = useState(false);
  const [attempt, setAttempt] = useState<{
    input: Record<string, unknown>;
    idempotencyKey: string;
  } | null>(null);
  const [memberSearch, setMemberSearch] = useState("");
  const lock = useRef(false);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  const form = useRef<HTMLFormElement>(null);
  const write = useMaterialWrite(context.org, context.project);
  const canReadMembers = context.permissions.includes("project-members:read");
  const members = useQuery({
    queryKey: [...materialKey(context.org, context.project), "members"],
    queryFn: () => projectsService.members(context.org, context.project),
    enabled: request && canReadMembers,
  });
  useEffect(() => {
    if (!dirty && !attempt) return;
    const message = attempt
      ? "The result is uncertain. Closing loses the retry key. Check history before recording again. Leave?"
      : "Discard unsaved Materials changes?";
    const unload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    const navigate = (event: MouseEvent) => {
      if (
        event.target instanceof Element &&
        event.target.closest("a[href]") &&
        (lock.current || !window.confirm(message))
      ) {
        event.preventDefault();
        event.stopPropagation();
      }
    };
    window.addEventListener("beforeunload", unload);
    document.addEventListener("click", navigate, true);
    return () => {
      window.removeEventListener("beforeunload", unload);
      document.removeEventListener("click", navigate, true);
    };
  }, [dirty, attempt]);
  function requestClose() {
    if (lock.current) return;
    if (
      (dirty || attempt) &&
      !window.confirm(
        attempt
          ? "The result is uncertain. Closing loses the retry key. Check history before recording again. Close?"
          : "Discard unsaved Materials changes?",
      )
    )
      return;
    close();
  }
  const change = (name: string, value: string) => {
    setDirty(true);
    setValues((v) => ({ ...v, [name]: value }));
  };
  function field(
    name: string,
    title: string,
    type = "text",
    required = false,
    maxLength = 120,
  ) {
    const quantity = name.endsWith("Quantity");
    return (
      <label className="block space-y-1" key={name}>
        {title}
        {required ? " *" : ""}
        <Input
          name={name}
          type={type}
          required={required}
          maxLength={maxLength}
          min={type === "number" ? (quantity ? "0.001" : "0") : undefined}
          step={type === "number" ? (quantity ? "0.001" : "0.01") : undefined}
          value={values[name] ?? ""}
          invalid={Boolean(errors[name])}
          aria-describedby={errors[name] ? `${name}-error` : undefined}
          onChange={(e) => change(name, e.target.value)}
        />
        {errors[name] && (
          <span
            id={`${name}-error`}
            className="block text-sm text-danger"
            role="alert"
          >
            {errors[name]}
          </span>
        )}
      </label>
    );
  }
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (lock.current || stale || denied || !context.active) return;
    const next: Record<string, string> = {};
    const value = (name: string) => (values[name] ?? "").trim();
    if (!attempt) {
      if (request && value("materialName").length < 2)
        next.materialName = "Enter at least 2 characters.";
      if (
        request &&
        values.unitOfMeasure === "OTHER" &&
        !value("customUnitLabel")
      )
        next.customUnitLabel = "Enter a custom unit.";
      const quantity = request
        ? "requestedQuantity"
        : purchase
          ? "orderedQuantity"
          : delivery
            ? "deliveredQuantity"
            : null;
      if (quantity) {
        const error = decimalError(value(quantity), 3, true);
        if (error) next[quantity] = error;
      }
      for (const name of request
        ? ["estimatedCost"]
        : purchase
          ? ["unitCost", "totalCost"]
          : [])
        if (value(name)) {
          const error = decimalError(value(name), 2);
          if (error) next[name] = error;
        }
      const dateField = request
        ? "requestedOn"
        : purchase
          ? "purchasedOn"
          : delivery
            ? "deliveredOn"
            : null;
      if (dateField && !validDate(value(dateField)))
        next[dateField] = "Choose a valid date.";
      if (
        request &&
        value("requiredByDate") &&
        (!validDate(value("requiredByDate")) ||
          value("requiredByDate") < value("requestedOn"))
      )
        next.requiredByDate =
          "Required date must be on or after the request date.";
      if (["RETURN", "REJECT", "CANCEL"].includes(action) && !value("comment"))
        next.comment = "A reason is required.";
      setErrors(next);
      if (Object.keys(next).length) {
        requestAnimationFrame(() =>
          form.current
            ?.querySelector<HTMLElement>(`[name="${Object.keys(next)[0]}"]`)
            ?.focus(),
        );
        return;
      }
    }
    const nullable = (name: string) => value(name) || null;
    const numeric = (name: string) =>
      value(name) ? Number(value(name)) : null;
    const input: Record<string, unknown> = request
      ? {
          materialName: value("materialName"),
          category: nullable("category"),
          requestedQuantity: Number(value("requestedQuantity")),
          unitOfMeasure: values.unitOfMeasure,
          customUnitLabel:
            values.unitOfMeasure === "OTHER" ? value("customUnitLabel") : null,
          requestedOn: values.requestedOn,
          requiredByDate: nullable("requiredByDate"),
          estimatedCost: numeric("estimatedCost"),
          responsibleContractorMemberId: nullable(
            "responsibleContractorMemberId",
          ),
          notes: nullable("notes"),
        }
      : purchase
        ? {
            orderedQuantity: Number(value("orderedQuantity")),
            vendorName: nullable("vendorName"),
            orderReference: nullable("orderReference"),
            unitCost: numeric("unitCost"),
            totalCost: numeric("totalCost"),
            purchasedOn: values.purchasedOn,
            notes: nullable("notes"),
          }
        : delivery
          ? {
              deliveredQuantity: Number(value("deliveredQuantity")),
              materialPurchaseId: nullable("materialPurchaseId"),
              deliveredOn: values.deliveredOn,
              deliveryReference: nullable("deliveryReference"),
              notes: nullable("notes"),
            }
          : { comment: nullable("comment") };
    if (action !== "CREATE") input.expectedVersion = version;
    const current = retainAttempt(attempt, input, () => crypto.randomUUID());
    setAttempt(current);
    lock.current = true;
    try {
      const record = await write.mutateAsync({
        action,
        id: detail?.id,
        input: { ...current.input, idempotencyKey: current.idempotencyKey },
      } as MaterialWrite);
      if (mounted.current) saved(record);
    } catch (error) {
      const apiError = error instanceof ApiError ? error : undefined;
      if (!uncertainFailure(apiError?.statusCode)) setAttempt(null);
      if (
        apiError?.statusCode === 409 ||
        [
          "MATERIAL_STATUS_TRANSITION_INVALID",
          "MATERIAL_ORDER_QUANTITY_EXCEEDED",
          "MATERIAL_DELIVERY_QUANTITY_EXCEEDED",
        ].includes(apiError?.code ?? "")
      )
        setStale(true);
      if (
        apiError?.statusCode === 403 ||
        apiError?.code === "PROJECT_STATUS_INVALID"
      )
        setDenied(true);
    } finally {
      lock.current = false;
    }
  }
  async function reviewLatest() {
    setRefreshing(true);
    try {
      const latest = await refresh();
      if (!latest) return;
      setVersion(latest.version);
      setStale(false);
      setDenied(!latest.availableActions.includes(action));
      write.reset();
    } finally {
      setRefreshing(false);
    }
  }
  return (
    <Dialog
      open
      title={action === "CREATE" ? "New material request" : label(action)}
      description={
        request
          ? "Save a draft, then submit it from the request detail."
          : "This action is recorded in the request history."
      }
      className="max-w-2xl"
      onOpenChange={requestClose}
      footer={
        <>
          <Button
            variant="outline"
            disabled={write.isPending}
            onClick={requestClose}
          >
            Close
          </Button>
          <Button
            form="material-form"
            type="submit"
            disabled={write.isPending || stale || denied || !context.active}
          >
            {write.isPending
              ? "Saving…"
              : attempt
                ? "Retry original request"
                : request
                  ? "Save draft"
                  : "Confirm"}
          </Button>
        </>
      }
    >
      <form
        id="material-form"
        ref={form}
        onSubmit={submit}
        noValidate
        className="space-y-5 text-base"
      >
        {detail && (
          <div className="rounded-inner border border-hairline p-3 text-sm">
            <p>Current record: version {detail.version}</p>
            <p>
              Requested {detail.requestedQuantity} · Ordered{" "}
              {detail.orderedQuantity} · Delivered {detail.deliveredQuantity}{" "}
              {detail.customUnitLabel ?? label(detail.unitOfMeasure)}
            </p>
          </div>
        )}
        {write.isError && (
          <p role="alert" className="text-danger">
            {write.error.message}
          </p>
        )}
        {attempt && write.isError && (
          <p role="status">
            The result is uncertain. Retry the original request with the same
            values and key to recover safely.
          </p>
        )}
        {stale && (
          <div role="alert">
            <p>
              {action === "CREATE"
                ? "This retry key conflicts with an existing request or changed workflow. Close and check the request list before creating another draft."
                : "The request changed. Reload it and review the latest quantities and history before submitting again. Your inputs are preserved."}
            </p>
            {action !== "CREATE" && (
              <Button
                variant="outline"
                disabled={refreshing}
                onClick={() => void reviewLatest()}
              >
                {refreshing ? "Reloading…" : "Reload latest record"}
              </Button>
            )}
          </div>
        )}
        {denied && (
          <p role="alert">
            This action is no longer available. Close the form and refresh
            project access.
          </p>
        )}
        <fieldset
          disabled={write.isPending || Boolean(attempt) || stale || denied}
          className="grid gap-4 sm:grid-cols-2"
        >
          {request && (
            <>
              {field("materialName", "Material name", "text", true, 160)}
              {field("category", "Category")}
              {field("requestedQuantity", "Requested quantity", "number", true)}
              <label>
                Unit *
                <Select
                  name="unitOfMeasure"
                  value={values.unitOfMeasure}
                  onChange={(e) => change("unitOfMeasure", e.target.value)}
                >
                  {MATERIAL_UNITS.map((unit) => (
                    <option key={unit} value={unit}>
                      {label(unit)}
                    </option>
                  ))}
                </Select>
              </label>
              {values.unitOfMeasure === "OTHER" &&
                field("customUnitLabel", "Custom unit", "text", true, 80)}
              {field("requestedOn", "Requested on", "date", true)}
              {field("requiredByDate", "Required by", "date")}
              {field("estimatedCost", "Estimated cost (INR)", "number")}
              {canReadMembers && (
                <div className="space-y-2 sm:col-span-2">
                  <label>
                    Find responsible member
                    <Input
                      value={memberSearch}
                      onChange={(e) => setMemberSearch(e.target.value)}
                    />
                  </label>
                  {members.isPending && <p role="status">Loading members…</p>}
                  {members.isError && (
                    <p role="alert">
                      {members.error.message}{" "}
                      <Button
                        variant="outline"
                        onClick={() => void members.refetch()}
                      >
                        Retry
                      </Button>
                    </p>
                  )}
                  <label>
                    Responsible member
                    <Select
                      value={values.responsibleContractorMemberId}
                      onChange={(e) =>
                        change("responsibleContractorMemberId", e.target.value)
                      }
                    >
                      <option value="">Unassigned</option>
                      {values.responsibleContractorMemberId &&
                        !members.data?.some(
                          (m) =>
                            m.memberId === values.responsibleContractorMemberId,
                        ) && (
                          <option value={values.responsibleContractorMemberId}>
                            Current member (
                            {values.responsibleContractorMemberId})
                          </option>
                        )}
                      {members.data
                        ?.filter(
                          (m) =>
                            m.memberId ===
                              values.responsibleContractorMemberId ||
                            (m.status === "ACTIVE" &&
                              m.user.name
                                .toLowerCase()
                                .includes(memberSearch.toLowerCase())),
                        )
                        .map((m) => (
                          <option key={m.memberId} value={m.memberId}>
                            {m.user.name} · {m.roleLabel ?? m.role.name}
                          </option>
                        ))}
                    </Select>
                  </label>
                </div>
              )}
            </>
          )}
          {purchase && (
            <>
              {field("orderedQuantity", "Ordered quantity", "number", true)}
              {field("purchasedOn", "Purchased on", "date", true)}
              {field("vendorName", "Vendor", "text", false, 160)}
              {field("orderReference", "Order reference")}
              {field("unitCost", "Unit cost (INR)", "number")}
              {field("totalCost", "Total cost (INR)", "number")}
              <p className="text-sm sm:col-span-2">
                Leave total cost blank to let the API calculate it from unit
                cost. Recording a purchase does not create an Expense.
              </p>
            </>
          )}
          {delivery && (
            <>
              {field("deliveredQuantity", "Delivered quantity", "number", true)}
              {field("deliveredOn", "Delivered on", "date", true)}
              {field("deliveryReference", "Delivery reference")}
              <label>
                Purchase reference
                <Select
                  value={values.materialPurchaseId ?? ""}
                  onChange={(e) => change("materialPurchaseId", e.target.value)}
                >
                  <option value="">No specific purchase</option>
                  {detail?.purchases.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.vendorName ?? "Purchase"} · {p.purchasedOn} ·{" "}
                      {p.orderedQuantity} · {p.orderReference ?? p.id}
                    </option>
                  ))}
                </Select>
              </label>
            </>
          )}
          <label className="sm:col-span-2">
            {request || purchase || delivery
              ? "Notes"
              : `Comment / reason${["RETURN", "REJECT", "CANCEL"].includes(action) ? " *" : ""}`}
            <Textarea
              name={request || purchase || delivery ? "notes" : "comment"}
              maxLength={2000}
              value={
                values[request || purchase || delivery ? "notes" : "comment"] ??
                ""
              }
              onChange={(e) =>
                change(
                  request || purchase || delivery ? "notes" : "comment",
                  e.target.value,
                )
              }
              invalid={Boolean(errors.comment)}
              aria-describedby={errors.comment ? "comment-error" : undefined}
            />
            {errors.comment && (
              <span
                id="comment-error"
                role="alert"
                className="text-sm text-danger"
              >
                {errors.comment}
              </span>
            )}
          </label>
        </fieldset>
      </form>
    </Dialog>
  );
}
