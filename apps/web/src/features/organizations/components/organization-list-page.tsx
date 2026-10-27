"use client";

import Link from "next/link";
import { Building2, KeyRound, Plus } from "lucide-react";
import { LoadingState } from "@/components/ui";
import { Suspense, useState, type FormEvent } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  OPERATING_PROFILES_BY_ORGANIZATION_TYPE,
  ORGANIZATION_STATUSES,
  ORGANIZATION_TYPES,
  type OperatingProfile,
  type OrganizationType,
} from "@nirman-app/shared";
import {
  Button,
  Card,
  Input,
  PageHeader,
  Select,
  StatusBadge,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui";
import {
  useCreateOrganization,
  useOwnerActivationLink,
  useOrganizations,
} from "@/features/organizations/hooks/use-organizations";
import { PermissionGuard } from "@/features/user-management/components/permission-guard";
import { useAuth } from "@/features/auth/hooks/use-auth";
import { OwnerActivationDialog } from "@/features/organizations/components/owner-activation-dialog";
import type {
  OrganizationOnboardingResponse,
  OwnerActivationLinkResponse,
} from "@/features/organizations/types/organizations.types";
import { ApiError } from "@/lib/api/api-client";
import { AdministrationFilters } from "@/features/administration/administration-filters";
import {
  administrationDetailUrl,
  administrationListUrl,
} from "@/features/administration/administration-list";

const statusTone = {
  ACTIVE: "active",
  DRAFT: "pending",
  SUSPENDED: "warning",
  ARCHIVED: "inactive",
} as const;

function OrganizationList() {
  const { hasPermission } = useAuth();
  const params = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const search = (params.get("search") ?? "").slice(0, 160);
  const status =
    ORGANIZATION_STATUSES.find((value) => value === params.get("status")) ?? "";
  const type =
    ORGANIZATION_TYPES.find((value) => value === params.get("type")) ?? "";
  const organizations = useOrganizations();
  const visible = (organizations.data ?? []).filter(
    (organization) =>
      (!status || organization.status === status) &&
      (!type || organization.type === type) &&
      `${organization.name} ${organization.operatingProfile}`
        .toLocaleLowerCase()
        .includes(search.toLocaleLowerCase()),
  );
  const createOrganization = useCreateOrganization();
  const refreshActivationLink = useOwnerActivationLink();
  const [isCreating, setIsCreating] = useState(false);
  const [form, setForm] = useState({
    name: "",
    type: "BUILDER" as OrganizationType,
    operatingProfile: "SELF_MANAGED_BUILDER" as OperatingProfile,
    timezone: "Asia/Kolkata",
    owner: {
      name: "",
      email: "",
      mobile: "",
      designation: "",
    },
  });
  const [createdOnboarding, setCreatedOnboarding] =
    useState<OrganizationOnboardingResponse | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [activation, setActivation] =
    useState<OwnerActivationLinkResponse | null>(null);
  const [activationOpen, setActivationOpen] = useState(false);
  const [activationNotice, setActivationNotice] = useState("");
  const [activationError, setActivationError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);
    try {
      const result = await createOrganization.mutateAsync({
        ...form,
        owner: {
          ...form.owner,
          designation: form.owner.designation || undefined,
        },
      });
      setCreatedOnboarding(result);
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
      setForm({
        name: "",
        type: "BUILDER",
        operatingProfile: "SELF_MANAGED_BUILDER",
        timezone: "Asia/Kolkata",
        owner: {
          name: "",
          email: "",
          mobile: "",
          designation: "",
        },
      });
      setIsCreating(false);
    } catch (error) {
      setFormError(
        error instanceof ApiError
          ? error.message
          : "Unable to create organization",
      );
    }
  }

  async function showActivationLink(organizationId: string) {
    setActivationError("");
    try {
      const result = await refreshActivationLink.mutateAsync(organizationId);
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
    if (!createdOnboarding) return;
    setActivation({
      organization: {
        id: createdOnboarding.organization.id,
        name: createdOnboarding.organization.name,
      },
      invitation: createdOnboarding.invitation,
    });
    setActivationNotice("");
    setActivationOpen(true);
  }

  return (
    <>
      <div className="space-y-4">
        <PageHeader
          title="Organizations"
          description="Manage all organization profiles, operating setup, and member access."
          actions={
            hasPermission("platform-organizations:create") ? (
              <Button onClick={() => setIsCreating((current) => !current)}>
                {!isCreating ? <Plus size={16} aria-hidden="true" /> : null}
                {isCreating ? "Close" : "New Organization"}
              </Button>
            ) : undefined
          }
        />

        <AdministrationFilters
          name="organizations"
          scope="Showing all organizations. Status, type and search filter the retrieved list."
          search={{
            value: search,
            placeholder: "Organization name or operating profile",
            onChange: (value) =>
              router.replace(
                administrationListUrl(pathname, params, { search: value }),
                { scroll: false },
              ),
          }}
          value={{ status, type }}
          fields={[
            {
              key: "status",
              label: "Status",
              options: ORGANIZATION_STATUSES.map((value) => ({
                value,
                label: value,
              })),
            },
            {
              key: "type",
              label: "Type",
              options: ORGANIZATION_TYPES.map((value) => ({
                value,
                label: value,
              })),
            },
          ]}
          onApply={(value) =>
            router.replace(administrationListUrl(pathname, params, value), {
              scroll: false,
            })
          }
        />

        {activationError ? (
          <Card>
            <p role="alert" className="text-danger">
              {activationError}
            </p>
          </Card>
        ) : null}

        {createdOnboarding ? (
          <Card className="border-lime/50 bg-lime/5">
            <div className="space-y-3">
              <div>
                <h2 className="text-[16px] font-semibold text-body">
                  Owner invitation ready
                </h2>
                <p className="mt-1 text-[13px] text-sub">
                  {createdOnboarding.organization.name} remains in DRAFT until
                  its primary Owner activates the account.{" "}
                  {invitationDeliveryMessage(
                    createdOnboarding.invitation.deliveryStatus,
                  )}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  onClick={showCreatedActivationLink}
                >
                  <KeyRound aria-hidden="true" size={15} />
                  Show activation link
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    router.push(
                      `/organizations/${createdOnboarding.organization.id}`,
                    )
                  }
                >
                  Open organization
                </Button>
              </div>
              <p className="text-[12px] text-sub">
                Expires{" "}
                {new Date(
                  createdOnboarding.invitation.expiresAt,
                ).toLocaleString()}
                .
                {createdOnboarding.invitation.deliveryStatus === "EMAIL_SENT"
                  ? " The links remain available as a secure fallback; no password was sent."
                  : " Share a link securely with the Owner; do not send a password."}
              </p>
            </div>
          </Card>
        ) : null}

        {isCreating ? (
          <PermissionGuard permission="platform-organizations:create">
            <Card>
              <form className="grid gap-3 md:grid-cols-2" onSubmit={submit}>
                <label className="grid gap-1 text-sm font-medium">
                  Organization name
                  <Input
                    placeholder="Organization name"
                    value={form.name}
                    onChange={(event) =>
                      setForm({ ...form, name: event.target.value })
                    }
                    required
                  />
                </label>
                <label className="grid gap-1 text-sm font-medium">
                  Organization type
                  <Select
                    value={form.type}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        type: event.target.value as OrganizationType,
                        operatingProfile:
                          event.target.value === "CONTRACTOR"
                            ? "INDEPENDENT_CONTRACTOR"
                            : "SELF_MANAGED_BUILDER",
                      })
                    }
                  >
                    {ORGANIZATION_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </Select>
                </label>
                <label className="grid gap-1 text-sm font-medium">
                  Operating profile
                  <Select
                    value={form.operatingProfile}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        operatingProfile: event.target
                          .value as OperatingProfile,
                      })
                    }
                  >
                    {OPERATING_PROFILES_BY_ORGANIZATION_TYPE[form.type].map(
                      (profile) => (
                        <option key={profile} value={profile}>
                          {profile}
                        </option>
                      ),
                    )}
                  </Select>
                </label>
                <label className="grid gap-1 text-sm font-medium">
                  Working timezone
                  <Input
                    placeholder="Timezone"
                    value={form.timezone}
                    onChange={(event) =>
                      setForm({ ...form, timezone: event.target.value })
                    }
                  />
                </label>
                <div className="flex min-h-10 items-center rounded-sub border border-hairline bg-sunken px-3 text-[13px] text-body">
                  <span className="text-sub">Default currency:</span>
                  <strong className="ml-1.5 font-semibold">INR</strong>
                </div>
                <div className="md:col-span-2 mt-2 border-t border-hairline pt-3">
                  <h2 className="text-[15px] font-semibold text-body">
                    Primary Owner
                  </h2>
                  <p className="text-[12px] text-sub">
                    The Owner receives an activation link and creates their own
                    password.
                  </p>
                </div>
                <label className="grid gap-1 text-sm font-medium">
                  Owner name
                  <Input
                    placeholder="Owner name"
                    value={form.owner.name}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        owner: { ...form.owner, name: event.target.value },
                      })
                    }
                    required
                  />
                </label>
                <label className="grid gap-1 text-sm font-medium">
                  Owner email
                  <Input
                    type="email"
                    placeholder="Owner email"
                    value={form.owner.email}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        owner: { ...form.owner, email: event.target.value },
                      })
                    }
                    required
                  />
                </label>
                <label className="grid gap-1 text-sm font-medium">
                  Owner mobile number
                  <Input
                    placeholder="Owner mobile number"
                    value={form.owner.mobile}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        owner: { ...form.owner, mobile: event.target.value },
                      })
                    }
                    required
                  />
                </label>
                <label className="grid gap-1 text-sm font-medium">
                  Owner designation (optional)
                  <Input
                    placeholder="Owner designation (optional)"
                    value={form.owner.designation}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        owner: {
                          ...form.owner,
                          designation: event.target.value,
                        },
                      })
                    }
                  />
                </label>
                {formError ? (
                  <p className="md:col-span-2 text-[12px] text-red-600">
                    {formError}
                  </p>
                ) : null}
                <div className="md:col-span-2">
                  <Button type="submit" disabled={createOrganization.isPending}>
                    {createOrganization.isPending
                      ? "Creating"
                      : "Create Organization"}
                  </Button>
                </div>
              </form>
            </Card>
          </PermissionGuard>
        ) : null}

        <Card>
          {organizations.isLoading ? (
            <LoadingState label="Loading organizations" />
          ) : organizations.isError ? (
            <p className="text-[13px] text-red-600">
              Unable to load organizations
            </p>
          ) : organizations.data?.length === 0 ? (
            <div className="flex items-center gap-3 text-[13px] text-body">
              <Building2 size={18} />
              No organizations are available for this account.
            </div>
          ) : visible.length === 0 ? (
            <p className="text-sm text-sub">
              No organizations match these filters.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Operating Profile</TableHead>
                  <TableHead>Timezone</TableHead>
                  <TableHead className="w-px text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visible.map((organization) => (
                  <TableRow key={organization.id}>
                    <TableCell>
                      <Link
                        href={administrationDetailUrl(
                          `/organizations/${organization.id}`,
                          administrationListUrl(pathname, params, {}),
                        )}
                      >
                        {organization.name}
                      </Link>
                    </TableCell>
                    <TableCell>{organization.type}</TableCell>
                    <TableCell>
                      <StatusBadge tone={statusTone[organization.status]}>
                        {organization.status}
                      </StatusBadge>
                    </TableCell>
                    <TableCell>{organization.operatingProfile}</TableCell>
                    <TableCell>{organization.timezone}</TableCell>
                    <TableCell className="w-px whitespace-nowrap text-right">
                      {organization.status === "DRAFT" &&
                      hasPermission("platform-organizations:create") ? (
                        <Button
                          size="sm"
                          variant="outline"
                          className="rounded-full px-3"
                          disabled={refreshActivationLink.isPending}
                          onClick={() =>
                            void showActivationLink(organization.id)
                          }
                        >
                          <KeyRound aria-hidden="true" size={15} />
                          {refreshActivationLink.isPending &&
                          refreshActivationLink.variables === organization.id
                            ? "Generating…"
                            : "Activation link"}
                        </Button>
                      ) : (
                        <span className="text-[12px] text-sub">
                          {organization.status === "ACTIVE" ? "Activated" : "—"}
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Card>
      </div>
      <OwnerActivationDialog
        open={activationOpen}
        activation={activation}
        notice={activationNotice}
        onOpenChange={setActivationOpen}
      />
    </>
  );
}

export function OrganizationListPage() {
  return (
    <PermissionGuard permission="platform-organizations:read">
      <Suspense fallback={<LoadingState label="Loading organizations" />}>
        <OrganizationList />
      </Suspense>
    </PermissionGuard>
  );
}

function invitationDeliveryMessage(
  status: OrganizationOnboardingResponse["invitation"]["deliveryStatus"],
) {
  if (status === "EMAIL_SENT") {
    return "The onboarding email was accepted by the configured mail server.";
  }
  if (status === "EMAIL_FAILED") {
    return "Email delivery failed. Verify the SMTP username and provider app password in Settings, then use one of the manual activation links below.";
  }
  return "SMTP is not configured, so delivery remains manual.";
}
