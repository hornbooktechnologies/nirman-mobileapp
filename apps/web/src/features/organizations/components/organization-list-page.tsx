"use client";

import Link from "next/link";
import { Building2, Plus } from "lucide-react";
import { useState, type FormEvent } from "react";
import {
  OPERATING_PROFILES_BY_ORGANIZATION_TYPE,
  ORGANIZATION_TYPES,
  type OperatingProfile,
  type OrganizationType,
} from "@nirman-app/shared";
import { Button, Card, Input, PageHeader, Select, StatusBadge, Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui";
import {
  useCreateOrganization,
  useOrganizations,
} from "@/features/organizations/hooks/use-organizations";
import { PermissionGuard } from "@/features/user-management/components/permission-guard";
import { useAuth } from "@/features/auth/hooks/use-auth";
import type { OrganizationOnboardingResponse } from "@/features/organizations/types/organizations.types";
import { ApiError } from "@/lib/api/api-client";

const statusTone = {
  ACTIVE: "active",
  DRAFT: "pending",
  SUSPENDED: "warning",
  ARCHIVED: "inactive",
} as const;

export function OrganizationListPage() {
  const { hasPermission } = useAuth();
  const organizations = useOrganizations();
  const createOrganization = useCreateOrganization();
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
  const [copiedLink, setCopiedLink] = useState<"web" | "mobile" | null>(null);

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
        error instanceof ApiError ? error.message : "Unable to create organization",
      );
    }
  }

  async function copyActivationLink(kind: "web" | "mobile", value: string) {
    await navigator.clipboard.writeText(value);
    setCopiedLink(kind);
  }

  return (
    <PermissionGuard anyOf={["platform-organizations:read", "organizations:read"]}>
      <div className="space-y-4">
        <PageHeader
          title="Organizations"
          description="Manage tenant profiles, operating setup, and member access."
          actions={hasPermission("platform-organizations:create") ? (
            <Button onClick={() => setIsCreating((current) => !current)}>
              <Plus size={16} />
              {isCreating ? "Close" : "New Organization"}
            </Button>
          ) : undefined}
        />

        {createdOnboarding ? (
          <Card className="border-lime/50 bg-lime/5">
            <div className="space-y-3">
              <div>
                <h2 className="text-[16px] font-semibold text-body">
                  Owner invitation ready
                </h2>
                <p className="mt-1 text-[13px] text-sub">
                  {createdOnboarding.organization.name} remains in DRAFT until its
                  primary Owner activates the account. {invitationDeliveryMessage(
                    createdOnboarding.invitation.deliveryStatus,
                  )}
                </p>
              </div>
              <div className="rounded-inner border border-hairline bg-surface p-3">
                <p className="break-all text-[12px] text-body">
                  {createdOnboarding.invitation.activationUrl}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button
                    type="button"
                    size="sm"
                    onClick={() =>
                      copyActivationLink(
                        "web",
                        createdOnboarding.invitation.activationUrl,
                      )
                    }
                  >
                    {copiedLink === "web" ? "Copied Web Link" : "Copy Web Link"}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      copyActivationLink(
                        "mobile",
                        createdOnboarding.invitation.mobileActivationUrl,
                      )
                    }
                  >
                    {copiedLink === "mobile"
                      ? "Copied Mobile Link"
                      : "Copy Mobile Link"}
                  </Button>
                </div>
              </div>
              <p className="text-[12px] text-sub">
                Expires {new Date(createdOnboarding.invitation.expiresAt).toLocaleString()}.
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
                <Input
                  placeholder="Organization name"
                  value={form.name}
                  onChange={(event) => setForm({ ...form, name: event.target.value })}
                  required
                />
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
                    <option key={type} value={type}>{type}</option>
                  ))}
                </Select>
                <Select
                  value={form.operatingProfile}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      operatingProfile: event.target.value as OperatingProfile,
                    })
                  }
                >
                  {OPERATING_PROFILES_BY_ORGANIZATION_TYPE[form.type].map((profile) => (
                    <option key={profile} value={profile}>{profile}</option>
                  ))}
                </Select>
                <Input
                  placeholder="Timezone"
                  value={form.timezone}
                  onChange={(event) => setForm({ ...form, timezone: event.target.value })}
                />
                <div className="flex min-h-10 items-center rounded-sub border border-hairline bg-sunken px-3 text-[13px] text-body">
                  <span className="text-sub">Default currency:</span>
                  <strong className="ml-1.5 font-semibold">INR</strong>
                </div>
                <div className="md:col-span-2 mt-2 border-t border-hairline pt-3">
                  <h2 className="text-[15px] font-semibold text-body">
                    Primary Owner
                  </h2>
                  <p className="text-[12px] text-sub">
                    The Owner receives an activation link and creates their own password.
                  </p>
                </div>
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
                <Input
                  placeholder="Owner designation (optional)"
                  value={form.owner.designation}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      owner: { ...form.owner, designation: event.target.value },
                    })
                  }
                />
                {formError ? (
                  <p className="md:col-span-2 text-[12px] text-red-600">{formError}</p>
                ) : null}
                <div className="md:col-span-2">
                  <Button type="submit" disabled={createOrganization.isPending}>
                    {createOrganization.isPending ? "Creating" : "Create Organization"}
                  </Button>
                </div>
              </form>
            </Card>
          </PermissionGuard>
        ) : null}

        <Card>
          {organizations.isLoading ? (
            <p className="text-[13px] text-body">Loading organizations</p>
          ) : organizations.isError ? (
            <p className="text-[13px] text-red-600">Unable to load organizations</p>
          ) : organizations.data?.length === 0 ? (
            <div className="flex items-center gap-3 text-[13px] text-body">
              <Building2 size={18} />
              No organizations are available for this account.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Operating Profile</TableHead>
                  <TableHead>Timezone</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {organizations.data?.map((organization) => (
                  <TableRow key={organization.id}>
                    <TableCell>
                      <Link href={`/organizations/${organization.id}`}>
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
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Card>
      </div>
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
