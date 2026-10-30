"use client";
import { ValidatedForm, ValidatedField } from "@/components/ui/validated-form";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState, type FormEvent } from "react";
import {
  ArrowUpRight,
  Building2,
  KeyRound,
  SlidersHorizontal,
} from "lucide-react";
import type { OrganizationType } from "@nirman-app/shared";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CollectionPagination } from "@/components/ui/collection-toolbar";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/layout";
import { Select } from "@/components/ui/select";
import { EmptyState, LoadingState } from "@/components/ui/states";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/features/auth/hooks/use-auth";
import { useCreateOrganization } from "@/features/organizations/hooks/use-organizations";
import { OwnerActivationDialog } from "@/features/organizations/components/owner-activation-dialog";
import type {
  OrganizationOnboardingResponse,
  OwnerActivationLinkResponse,
} from "@/features/organizations/types/organizations.types";
import { PermissionGuard } from "@/features/user-management/components/permission-guard";
import {
  useConvertWebsiteEnquiry,
  useUpdateWebsiteEnquiry,
  useWebsiteEnquiries,
  useWebsiteEnquiryActivities,
  useWebsiteEnquiryActivationLink,
} from "@/features/website-enquiries/hooks/use-website-enquiries";
import type {
  WebsiteEnquiry,
  WebsiteEnquiryStatus,
} from "@/features/website-enquiries/types/website-enquiries.types";
import { ApiError } from "@/lib/api/api-client";

const PAGE_SIZE = 25;
const STATUSES: { value: WebsiteEnquiryStatus; label: string }[] = [
  { value: "SUBMITTED", label: "Submitted" },
  { value: "CONTACTED", label: "Contacted" },
  { value: "FOLLOW_UP", label: "Follow-up" },
  { value: "INTERESTED", label: "Interested" },
  { value: "NOT_INTERESTED", label: "Not interested" },
  { value: "CREATED", label: "Organization created" },
];
const EMPTY_ORGANIZATION = {
  name: "",
  type: "BUILDER" as OrganizationType,
  ownerName: "",
  ownerEmail: "",
  ownerMobile: "",
};

function statusLabel(status: WebsiteEnquiryStatus) {
  return STATUSES.find((item) => item.value === status)?.label ?? status;
}

function statusTone(
  status: WebsiteEnquiryStatus,
): "info" | "warning" | "success" | "danger" | "purple" | "neutral" {
  if (status === "CREATED") return "success";
  if (status === "NOT_INTERESTED") return "danger";
  if (status === "INTERESTED") return "purple";
  if (status === "FOLLOW_UP") return "warning";
  if (status === "CONTACTED") return "info";
  return "neutral";
}

function EnquiryStatus({ status }: { status: WebsiteEnquiryStatus }) {
  return (
    <StatusBadge
      tone={statusTone(status)}
      className="min-h-7 whitespace-nowrap rounded-full px-3 text-xs shadow-none"
    >
      {statusLabel(status)}
    </StatusBadge>
  );
}

function listUrl(
  pathname: string,
  params: URLSearchParams,
  updates: Record<string, string>,
) {
  const next = new URLSearchParams(params.toString());
  for (const [key, value] of Object.entries(updates)) {
    if (value) next.set(key, value);
    else next.delete(key);
  }
  return next.size ? `${pathname}?${next}` : pathname;
}

function localInputValue(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000)
    .toISOString()
    .slice(0, 16);
}

function WebsiteEnquiriesList() {
  const pathname = usePathname();
  const router = useRouter();
  const params = useSearchParams();
  const page = Math.max(1, Number(params.get("page")) || 1);
  const search = (params.get("search") ?? "").slice(0, 150);
  const rawStatus = params.get("status");
  const status = STATUSES.some((item) => item.value === rawStatus)
    ? (rawStatus as WebsiteEnquiryStatus)
    : undefined;
  const enquiries = useWebsiteEnquiries({
    page,
    limit: PAGE_SIZE,
    search: search || undefined,
    status,
  });
  const createOrganization = useCreateOrganization();
  const convertEnquiry = useConvertWebsiteEnquiry();
  const refreshActivationLink = useWebsiteEnquiryActivationLink();
  const updateEnquiry = useUpdateWebsiteEnquiry();
  const { hasPermission } = useAuth();
  const [creating, setCreating] = useState<WebsiteEnquiry | null>(null);
  const [managing, setManaging] = useState<WebsiteEnquiry | null>(null);
  const activities = useWebsiteEnquiryActivities(managing?.id);
  const [organization, setOrganization] = useState(EMPTY_ORGANIZATION);
  const [workflow, setWorkflow] = useState({
    status: "SUBMITTED" as WebsiteEnquiryStatus,
    nextFollowUpAt: "",
    adminNotes: "",
  });
  const [formError, setFormError] = useState<string | null>(null);
  const [created, setCreated] = useState<OrganizationOnboardingResponse | null>(
    null,
  );
  const [activation, setActivation] =
    useState<OwnerActivationLinkResponse | null>(null);
  const [activationOpen, setActivationOpen] = useState(false);
  const [activationNotice, setActivationNotice] = useState("");
  const [activationError, setActivationError] = useState("");
  const creatingBusy = createOrganization.isPending || convertEnquiry.isPending;

  function replace(updates: Record<string, string>) {
    router.replace(
      listUrl(pathname, new URLSearchParams(params.toString()), updates),
      { scroll: false },
    );
  }

  function openManage(enquiry: WebsiteEnquiry) {
    setFormError(null);
    setManaging(enquiry);
    setWorkflow({
      status: enquiry.status,
      nextFollowUpAt: localInputValue(enquiry.nextFollowUpAt),
      adminNotes: enquiry.adminNotes ?? "",
    });
  }

  function openCreate(enquiry: WebsiteEnquiry) {
    setFormError(null);
    setCreating(enquiry);
    setOrganization({
      name: enquiry.name,
      type: enquiry.organizationType ?? "BUILDER",
      ownerName: enquiry.name,
      ownerEmail: enquiry.email,
      ownerMobile: enquiry.phone.slice(0, 20),
    });
  }

  async function submitWorkflow(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!managing) return;
    setFormError(null);
    try {
      await updateEnquiry.mutateAsync({
        enquiryId: managing.id,
        input: {
          status: workflow.status,
          nextFollowUpAt: workflow.nextFollowUpAt
            ? new Date(workflow.nextFollowUpAt).toISOString()
            : null,
          adminNotes: workflow.adminNotes || null,
        },
      });
      setManaging(null);
    } catch (error) {
      setFormError(
        error instanceof ApiError
          ? error.message
          : "Unable to update the enquiry",
      );
    }
  }

  async function submitOrganization(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!creating) return;
    setFormError(null);
    try {
      const result = await createOrganization.mutateAsync({
        name: organization.name,
        type: organization.type,
        operatingProfile: "CUSTOM",
        timezone: "Asia/Kolkata",
        currency: "INR",
        owner: {
          name: organization.ownerName,
          email: organization.ownerEmail,
          mobile: organization.ownerMobile,
        },
      });
      await convertEnquiry.mutateAsync({
        enquiryId: creating.id,
        organizationId: result.organization.id,
      });
      setCreated(result);
      setActivation({
        organization: {
          id: result.organization.id,
          name: result.organization.name,
        },
        invitation: result.invitation,
      });
      setActivationNotice("");
      setActivationError("");
      setActivationOpen(true);
      setCreating(null);
      setOrganization(EMPTY_ORGANIZATION);
    } catch (error) {
      setFormError(
        error instanceof ApiError
          ? error.message
          : "Unable to create the organization",
      );
    }
  }

  async function showActivationLink(enquiry: WebsiteEnquiry) {
    setActivationError("");
    try {
      const result = await refreshActivationLink.mutateAsync(enquiry.id);
      setActivation(result);
      setActivationNotice(
        "A fresh activation link was generated. Any previous pending link is now invalid.",
      );
      setActivationOpen(true);
    } catch (error) {
      setActivationError(
        error instanceof ApiError
          ? error.message
          : "Unable to generate the activation link",
      );
    }
  }

  function showCreatedActivationLink() {
    if (!created) return;
    setActivation({
      organization: {
        id: created.organization.id,
        name: created.organization.name,
      },
      invitation: created.invitation,
    });
    setActivationNotice("");
    setActivationOpen(true);
  }

  const canUpdate = hasPermission("platform-enquiries:update");
  const canCreate = hasPermission("platform-organizations:create") && canUpdate;
  const total = enquiries.data?.meta.total ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <PermissionGuard permission="platform-enquiries:read">
      <div className="space-y-4">
        <PageHeader
          title="Website Enquiries"
          description="Track every contact-us submission through follow-up and organization creation."
        />
        {activationError ? (
          <Card>
            <p role="alert" className="text-danger">
              {activationError}
            </p>
          </Card>
        ) : null}
        {created ? (
          <Card
            variant="lime"
            className="flex flex-wrap items-center justify-between gap-3"
          >
            <div>
              <p className="font-semibold">
                {created.organization.name} was created.
              </p>
              <p className="mt-1 text-[13px]">
                The Owner activation link is available until{" "}
                {new Date(created.invitation.expiresAt).toLocaleString("en-IN")}
                .
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={showCreatedActivationLink}>
                Show activation link
              </Button>
              <Button
                variant="outline"
                onClick={() =>
                  router.push(`/organizations/${created.organization.id}`)
                }
              >
                Open organization
              </Button>
            </div>
          </Card>
        ) : null}
        <Card padding="compact">
          <ValidatedForm
            className="flex flex-col gap-3 sm:flex-row sm:items-end"
            role="search"
            onSubmit={(event) => {
              event.preventDefault();
              replace({
                search: String(
                  new FormData(event.currentTarget).get("search") ?? "",
                ).trim(),
                page: "1",
              });
            }}
          >
            <ValidatedField className="min-w-0 flex-1 text-[13px] font-medium text-body">
              Search
              <Input
                key={search}
                name="search"
                defaultValue={search}
                maxLength={150}
                placeholder="Customer name, mobile, or email"
                className="mt-1"
              />
            </ValidatedField>
            <ValidatedField className="text-[13px] font-medium text-body sm:w-52">
              Status
              <Select
                value={status ?? ""}
                className="mt-1"
                onChange={(event) =>
                  replace({ status: event.target.value, page: "1" })
                }
              >
                <option value="">All statuses</option>
                {STATUSES.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </Select>
            </ValidatedField>
            <Button type="submit">Search</Button>
          </ValidatedForm>
        </Card>
        {enquiries.isPending ? (
          <LoadingState label="Loading website enquiries" />
        ) : enquiries.isError ? (
          <Card>
            <p role="alert">{enquiries.error.message}</p>
            <Button
              className="mt-3"
              variant="outline"
              onClick={() => void enquiries.refetch()}
            >
              Retry
            </Button>
          </Card>
        ) : enquiries.data.data.length === 0 ? (
          <EmptyState
            title="No enquiries found"
            description="Contact-us submissions will appear here."
          />
        ) : (
          <Card padding="none">
            <Table className="min-w-[1120px]">
              <TableHeader>
                <TableRow>
                  <TableHead>Customer</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Message</TableHead>
                  <TableHead>Received</TableHead>
                  <TableHead>Next follow-up</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-px text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {enquiries.data.data.map((enquiry) => (
                  <TableRow key={enquiry.id}>
                    <TableCell>
                      <p className="font-semibold">{enquiry.name}</p>
                      <p className="text-sub">
                        {enquiry.organizationType === "BUILDER"
                          ? "Builder"
                          : enquiry.organizationType === "CONTRACTOR"
                            ? "Contractor"
                            : "Type not recorded"}
                      </p>
                      <a
                        className="text-sub underline"
                        href={`mailto:${enquiry.email}`}
                      >
                        {enquiry.email}
                      </a>
                    </TableCell>
                    <TableCell>
                      <a className="underline" href={`tel:${enquiry.phone}`}>
                        {enquiry.phone}
                      </a>
                    </TableCell>
                    <TableCell className="max-w-sm">
                      <p className="line-clamp-3 whitespace-pre-wrap">
                        {enquiry.message || "—"}
                      </p>
                    </TableCell>
                    <TableCell>
                      {new Date(enquiry.createdAt).toLocaleString("en-IN")}
                    </TableCell>
                    <TableCell>
                      {enquiry.nextFollowUpAt
                        ? new Date(enquiry.nextFollowUpAt).toLocaleString(
                            "en-IN",
                          )
                        : "—"}
                    </TableCell>
                    <TableCell>
                      <EnquiryStatus status={enquiry.status} />
                    </TableCell>
                    <TableCell className="w-px whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        {canUpdate ? (
                          <Button
                            size="sm"
                            variant="outline"
                            className="whitespace-nowrap rounded-full px-3"
                            onClick={() => openManage(enquiry)}
                          >
                            <SlidersHorizontal aria-hidden="true" size={15} />
                            Manage
                          </Button>
                        ) : null}
                        {enquiry.status !== "CREATED" && canCreate ? (
                          <Button
                            size="sm"
                            className="whitespace-nowrap rounded-full px-3.5"
                            onClick={() => openCreate(enquiry)}
                          >
                            <Building2 aria-hidden="true" size={15} />
                            Create org
                          </Button>
                        ) : null}
                        {enquiry.status === "CREATED" &&
                        enquiry.convertedOrganization &&
                        canCreate ? (
                          <Button
                            size="sm"
                            variant="outline"
                            className="whitespace-nowrap rounded-full px-3"
                            disabled={refreshActivationLink.isPending}
                            onClick={() => void showActivationLink(enquiry)}
                          >
                            <KeyRound aria-hidden="true" size={15} />
                            {refreshActivationLink.isPending &&
                            refreshActivationLink.variables === enquiry.id
                              ? "Generating…"
                              : "Activation link"}
                          </Button>
                        ) : null}
                        {enquiry.convertedOrganization ? (
                          <Button
                            size="sm"
                            variant="outline"
                            className="whitespace-nowrap rounded-full px-3"
                            onClick={() =>
                              router.push(
                                `/organizations/${enquiry.convertedOrganization?.id}`,
                              )
                            }
                          >
                            <ArrowUpRight aria-hidden="true" size={15} />
                            Open org
                          </Button>
                        ) : null}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <div className="px-5 pb-5">
              <CollectionPagination
                page={page}
                pageCount={pageCount}
                total={total}
                busy={enquiries.isFetching}
                onPageChange={(next) => replace({ page: String(next) })}
              />
            </div>
          </Card>
        )}
      </div>

      <Dialog
        open={Boolean(managing)}
        title="Manage enquiry"
        description={
          managing ? `${managing.name} · ${managing.phone}` : undefined
        }
        onOpenChange={(open) => {
          if (!open && !updateEnquiry.isPending) setManaging(null);
        }}
        footer={
          <>
            <Button
              variant="outline"
              disabled={updateEnquiry.isPending}
              onClick={() => setManaging(null)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              form="website-enquiry-workflow"
              disabled={
                updateEnquiry.isPending || managing?.status === "CREATED"
              }
            >
              {updateEnquiry.isPending ? "Saving…" : "Save follow-up"}
            </Button>
          </>
        }
      >
        <ValidatedForm
          id="website-enquiry-workflow"
          className="grid gap-4"
          onSubmit={submitWorkflow}
        >
          {formError ? (
            <p
              className="rounded-inner bg-danger/10 p-3 text-danger"
              role="alert"
            >
              {formError}
            </p>
          ) : null}
          <Card variant="sunken" padding="compact">
            <p className="font-semibold">Organization type</p>
            <p className="mt-1 text-sub">
              {managing?.organizationType === "BUILDER"
                ? "Builder"
                : managing?.organizationType === "CONTRACTOR"
                  ? "Contractor"
                  : "Not recorded"}
            </p>
          </Card>
          <ValidatedField className="grid gap-1 font-medium">
            Status
            <Select
              disabled={managing?.status === "CREATED"}
              value={workflow.status}
              onChange={(event) =>
                setWorkflow((current) => ({
                  ...current,
                  status: event.target.value as WebsiteEnquiryStatus,
                }))
              }
            >
              {STATUSES.filter(
                (item) =>
                  item.value !== "CREATED" || managing?.status === "CREATED",
              ).map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </Select>
          </ValidatedField>
          <ValidatedField className="grid gap-1 font-medium">
            Next follow-up
            <Input
              type="datetime-local"
              required={workflow.status === "FOLLOW_UP"}
              disabled={managing?.status === "CREATED"}
              value={workflow.nextFollowUpAt}
              onChange={(event) =>
                setWorkflow((current) => ({
                  ...current,
                  nextFollowUpAt: event.target.value,
                }))
              }
            />
          </ValidatedField>
          <ValidatedField className="grid gap-1 font-medium">
            Admin notes
            <Textarea
              maxLength={2000}
              disabled={managing?.status === "CREATED"}
              value={workflow.adminNotes}
              onChange={(event) =>
                setWorkflow((current) => ({
                  ...current,
                  adminNotes: event.target.value,
                }))
              }
              placeholder="Call outcome, customer requirement, or next action"
            />
          </ValidatedField>
          {managing?.message ? (
            <Card variant="sunken" padding="compact">
              <p className="font-semibold">Customer message</p>
              <p className="mt-1 whitespace-pre-wrap text-sub">
                {managing.message}
              </p>
            </Card>
          ) : null}
          <div>
            <p className="mb-2 font-semibold">Activity history</p>
            {activities.isPending ? (
              <p className="text-sub">Loading activity…</p>
            ) : activities.data?.length ? (
              <div className="space-y-2">
                {activities.data.map((activity) => (
                  <div
                    key={activity.id}
                    className="rounded-inner border border-hairline p-3"
                  >
                    <div className="flex flex-wrap justify-between gap-2">
                      <EnquiryStatus status={activity.status} />
                      <span className="text-sub">
                        {new Date(activity.createdAt).toLocaleString("en-IN")}
                      </span>
                    </div>
                    {activity.note ? (
                      <p className="mt-2 whitespace-pre-wrap">
                        {activity.note}
                      </p>
                    ) : null}
                    <p className="mt-1 text-sub">
                      Updated by {activity.actor.name || "System administrator"}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sub">No follow-up activity yet.</p>
            )}
          </div>
        </ValidatedForm>
      </Dialog>

      <Dialog
        open={Boolean(creating)}
        title="Create organization from enquiry"
        description="Customer contact details are already filled in. Confirm the organization details."
        onOpenChange={(open) => {
          if (!open && !creatingBusy) setCreating(null);
        }}
        footer={
          <>
            <Button
              variant="outline"
              disabled={creatingBusy}
              onClick={() => setCreating(null)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              form="website-enquiry-organization"
              disabled={creatingBusy}
            >
              {creatingBusy ? "Creating…" : "Create organization"}
            </Button>
          </>
        }
      >
        <ValidatedForm
          id="website-enquiry-organization"
          className="grid gap-3"
          onSubmit={submitOrganization}
        >
          {formError ? (
            <p
              className="rounded-inner bg-danger/10 p-3 text-danger"
              role="alert"
            >
              {formError}
            </p>
          ) : null}
          <ValidatedField className="text-[13px] font-medium">
            Organization name
            <Input
              required
              maxLength={160}
              className="mt-1"
              value={organization.name}
              onChange={(event) =>
                setOrganization((current) => ({
                  ...current,
                  name: event.target.value,
                }))
              }
            />
          </ValidatedField>
          <ValidatedField className="text-[13px] font-medium">
            Organization type
            <Select
              className="mt-1"
              value={organization.type}
              onChange={(event) =>
                setOrganization((current) => ({
                  ...current,
                  type: event.target.value as OrganizationType,
                }))
              }
            >
              <option value="BUILDER">Builder</option>
              <option value="CONTRACTOR">Contractor</option>
            </Select>
          </ValidatedField>
          <ValidatedField className="text-[13px] font-medium">
            Owner name
            <Input
              required
              maxLength={100}
              className="mt-1"
              value={organization.ownerName}
              onChange={(event) =>
                setOrganization((current) => ({
                  ...current,
                  ownerName: event.target.value,
                }))
              }
            />
          </ValidatedField>
          <ValidatedField className="text-[13px] font-medium">
            Owner email
            <Input
              required
              type="email"
              maxLength={190}
              className="mt-1"
              value={organization.ownerEmail}
              onChange={(event) =>
                setOrganization((current) => ({
                  ...current,
                  ownerEmail: event.target.value,
                }))
              }
            />
          </ValidatedField>
          <ValidatedField className="text-[13px] font-medium">
            Owner mobile
            <Input
              required
              maxLength={20}
              className="mt-1"
              value={organization.ownerMobile}
              onChange={(event) =>
                setOrganization((current) => ({
                  ...current,
                  ownerMobile: event.target.value,
                }))
              }
            />
          </ValidatedField>
        </ValidatedForm>
      </Dialog>

      <OwnerActivationDialog
        open={activationOpen}
        activation={activation}
        notice={activationNotice}
        onOpenChange={setActivationOpen}
      />
    </PermissionGuard>
  );
}

export function WebsiteEnquiriesPage() {
  return (
    <Suspense fallback={<LoadingState label="Loading website enquiries" />}>
      <WebsiteEnquiriesList />
    </Suspense>
  );
}
