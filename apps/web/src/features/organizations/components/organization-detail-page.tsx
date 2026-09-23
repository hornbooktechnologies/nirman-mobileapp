"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { LoadingState } from "@/components/ui";
import { Check, RefreshCw } from "lucide-react";
import { Suspense, useState, type FormEvent } from "react";
import {
  OPERATING_PROFILES_BY_ORGANIZATION_TYPE,
  ORGANIZATION_STATUSES,
  type OperatingProfile,
  type OrganizationStatus,
} from "@nirman-app/shared";
import {
  Button,
  Card,
  Dialog,
  Input,
  PageHeader,
  Select,
  StatusBadge,
} from "@/components/ui";
import {
  useOrganization,
  useSwitchOrganization,
  useUpdateOrganization,
} from "@/features/organizations/hooks/use-organizations";
import { PermissionGuard } from "@/features/user-management/components/permission-guard";
import { useAuth } from "@/features/auth/hooks/use-auth";
import { safeAdministrationReturn } from "@/features/administration/administration-list";

const orgStatusTone = {
  ACTIVE: "active",
  DRAFT: "pending",
  SUSPENDED: "warning",
  ARCHIVED: "inactive",
} as const;

function OrganizationDetail({
  organizationId,
}: {
  organizationId: string;
}) {
  const router = useRouter();
  const returnTo = safeAdministrationReturn(useSearchParams().get("returnTo"), "organizations");
  const { hasPermission } = useAuth();
  const organization = useOrganization(organizationId);
  const updateOrganization = useUpdateOrganization(organizationId);
  const switchOrganization = useSwitchOrganization();
  const [draft, setForm] = useState<{
    name: string;
    status: OrganizationStatus;
    operatingProfile: OperatingProfile;
    timezone: string;
  } | null>(null);
  const [pendingStatusChange, setPendingStatusChange] = useState(false);
  const form = draft ?? {
    name: organization.data?.name ?? "",
    status: organization.data?.status ?? "ACTIVE",
    operatingProfile: organization.data?.operatingProfile ?? "CUSTOM",
    timezone: organization.data?.timezone ?? "Asia/Kolkata",
  };
  const canSwitchOrganization = hasPermission("organizations:read");
  const canUpdateDetails = hasPermission("platform-organizations:update") || hasPermission("organizations:update");
  const canChangeStatus =
    hasPermission("organizations:activate") ||
    hasPermission("organizations:deactivate") ||
    hasPermission("platform-organizations:activate") ||
    hasPermission("platform-organizations:suspend");
  const allowedOperatingProfiles: readonly OperatingProfile[] =
    OPERATING_PROFILES_BY_ORGANIZATION_TYPE[
      organization.data?.type ?? "BUILDER"
    ];
  const hasCompatibleOperatingProfile = allowedOperatingProfiles.includes(
    form.operatingProfile,
  );

  async function save() {
    try {
      await updateOrganization.mutateAsync(form);
      const refreshed = await organization.refetch();
      if (!refreshed.error) setForm(null);
      setPendingStatusChange(false);
    } catch {
      // The mutation error stays visible beside the form without discarding edits.
    }
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (organization.data && form.status !== organization.data.status) {
      setPendingStatusChange(true);
      return;
    }
    void save();
  }

  return (
    <PermissionGuard
      anyOf={["platform-organizations:read", "organizations:read"]}
    >
      <div className="space-y-4">
        <PageHeader
          title={organization.data?.name ?? "Organization"}
          description="Review organization setup and workspace defaults."
          onBack={() => router.push(returnTo)}
          actions={
            <div className="flex flex-wrap items-center gap-2">
              {organization.data ? (
                <StatusBadge tone={orgStatusTone[organization.data.status]}>
                  {organization.data.status}
                </StatusBadge>
              ) : null}
              {canSwitchOrganization ? (
                <Button
                  variant="outline"
                  onClick={() => switchOrganization.mutate(organizationId)}
                  disabled={switchOrganization.isPending}
                >
                  <RefreshCw size={16} />
                  {switchOrganization.isPending ? "Switching" : "Switch"}
                </Button>
              ) : null}
            </div>
          }
        />

        <Card className="space-y-4">
          {organization.isLoading ? (
            <LoadingState label="Loading organization" />
          ) : organization.isError ? (
            <p className="text-[13px] text-red-600">
              Unable to load organization
            </p>
          ) : organization.data ? (
            <>
            <section aria-label="Organization details" className="space-y-3">
              <h2 className="text-lg font-semibold">Organization context</h2>
              <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {[["Type", organization.data.type], ["Operating profile", organization.data.operatingProfile.replaceAll("_", " ")], ["Working timezone", organization.data.timezone], ["Currency", organization.data.currency]].map(([name, value]) => <div key={name}><dt className="text-sm text-sub">{name}</dt><dd className="break-words font-medium">{value}</dd></div>)}
              </dl>
              <p className="text-sm text-sub">Organization roles determine member permissions. Project access can be managed from Members.</p>
            </section>
            {canUpdateDetails ? (
              <form className="grid gap-4 border-t border-hairline pt-4" onSubmit={submit}>
                <h2 className="text-lg font-semibold">Edit organization setup</h2>
                <label className="grid gap-1 text-sm font-medium">Organization name<Input
                  value={form.name}
                  onChange={(event) =>
                    setForm({ ...form, name: event.target.value })
                  }
                  required
                /></label>
                <label className="grid gap-1 text-sm font-medium">Operating profile<Select
                  value={form.operatingProfile}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      operatingProfile: event.target.value as OperatingProfile,
                    })
                  }
                >
                  {!hasCompatibleOperatingProfile ? (
                    <option value={form.operatingProfile}>
                      {form.operatingProfile} (incompatible - choose a valid
                      profile)
                    </option>
                  ) : null}
                  {allowedOperatingProfiles.map((profile) => (
                    <option key={profile} value={profile}>
                      {profile}
                    </option>
                  ))}
                </Select></label>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="grid gap-1 text-sm font-medium">Working timezone<Input
                    value={form.timezone}
                    onChange={(event) =>
                      setForm({ ...form, timezone: event.target.value })
                    }
                  /></label>
                  <div className="flex min-h-10 items-center rounded-sub border border-hairline bg-sunken px-3 text-[13px] text-body">
                    <span className="text-sub">Default currency:</span>
                    <strong className="ml-1.5 font-semibold">
                      {organization.data?.currency ?? "INR"}
                    </strong>
                  </div>
                </div>
                {canChangeStatus && <section className="space-y-2 rounded-inner border border-hairline bg-sunken p-4" aria-label="Organization status management">
                  <h3 className="font-semibold">Status and access</h3>
                  <p className="text-sm text-sub">Changing status can affect access for the whole organization. Review the selected status before saving.</p>
                  <label className="grid gap-1 text-sm font-medium">Organization status<Select value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value as OrganizationStatus })}>
                    {ORGANIZATION_STATUSES.map((status) => <option key={status} value={status}>{status}</option>)}
                  </Select></label>
                </section>}
                <Button type="submit" disabled={updateOrganization.isPending}>
                  <Check size={16} />
                  {updateOrganization.isPending
                    ? "Saving"
                    : "Save Organization"}
                </Button>
                {updateOrganization.isError && <p role="alert" className="text-sm text-danger">{updateOrganization.error instanceof Error ? updateOrganization.error.message : "Unable to save organization."}</p>}
                {updateOrganization.isSuccess && <p role="status" className="text-sm text-success">Organization saved.</p>}
              </form>
            ) : <p className="border-t border-hairline pt-4 text-sm text-sub">This organization is read-only for your role. An authorized organization administrator can change its setup.</p>}
            </>
          ) : null}
        </Card>
        <Dialog open={pendingStatusChange} title="Confirm organization status change" description="Changing status can affect every member's access to this organization." onOpenChange={(open) => { if (!open) setPendingStatusChange(false); }} footer={<><Button variant="outline" onClick={() => setPendingStatusChange(false)}>Keep current status</Button><Button variant={form.status === "ACTIVE" ? "primary" : "danger"} disabled={updateOrganization.isPending} onClick={() => void save()}>{updateOrganization.isPending ? "Saving" : `Save ${form.status.toLowerCase()} status`}</Button></>}>
          <p>Change {organization.data?.name} from <strong>{organization.data?.status}</strong> to <strong>{form.status}</strong>. Any other edited setup fields will be saved at the same time.</p>
          {updateOrganization.isError && <p role="alert" className="mt-3 text-sm text-danger">{updateOrganization.error instanceof Error ? updateOrganization.error.message : "Unable to save organization."}</p>}
        </Dialog>
      </div>
    </PermissionGuard>
  );
}

export function OrganizationDetailPage({ organizationId }: { organizationId: string }) {
  return <Suspense fallback={<LoadingState label="Loading organization" />}><OrganizationDetail organizationId={organizationId} /></Suspense>;
}
