"use client";

import { useState, type FormEvent } from "react";
import { Plus } from "lucide-react";
import { SUBSCRIPTION_STATUSES, type SubscriptionStatus } from "@nirman-app/shared";
import {
  Badge,
  Button,
  Card,
  Dialog,
  Input,
  PageHeader,
  Select,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  LoadingState,
  StatusBadge,
} from "@/components/ui";
import { useAuth } from "@/features/auth/hooks/use-auth";
import { AdministrationFilters } from "@/features/administration/administration-filters";
import { useOrganizations } from "@/features/organizations/hooks/use-organizations";
import { PermissionGuard } from "@/features/user-management/components/permission-guard";
import {
  useAssignOrganizationSubscription,
  useCreateSubscriptionPlan,
  useOrganizationSubscription,
  useSubscriptionPlans,
} from "./hooks";
import { subscriptionTone } from "./subscription-view";

const today = () => new Date().toISOString().slice(0, 10);

export function SubscriptionsPage() {
  const { hasPermission } = useAuth();
  const canUpdate = hasPermission("platform-subscriptions:update");
  const plans = useSubscriptionPlans();
  const organizations = useOrganizations();
  const [showCreate, setShowCreate] = useState(false);
  const [selectedOrganizationId, setSelectedOrganizationId] = useState("");
  const summary = useOrganizationSubscription(selectedOrganizationId);
  const assignSubscription = useAssignOrganizationSubscription(selectedOrganizationId);
  const createPlan = useCreateSubscriptionPlan();
  const [planForm, setPlanForm] = useState({
    planKey: "",
    name: "",
    description: "",
    maxActiveProjects: "",
    maxActiveMembers: "",
    storageLimitGb: "",
  });
  const [assignment, setAssignment] = useState({
    planId: "",
    status: "ACTIVE" as SubscriptionStatus,
    startsAt: today(),
    endsAt: "",
    internalNote: "",
  });
  const [error, setError] = useState("");
  const [savedOrganizationId, setSavedOrganizationId] = useState("");
  const [planSearch, setPlanSearch] = useState("");
  const [planFilters, setPlanFilters] = useState({ status: "" });
  const visiblePlans = (plans.data ?? []).filter((plan) =>
    (!planFilters.status || (planFilters.status === "active" ? plan.isActive : !plan.isActive)) &&
    `${plan.name} ${plan.planKey} ${plan.description ?? ""}`.toLocaleLowerCase().includes(planSearch.toLocaleLowerCase()),
  );

  async function submitPlan(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    try {
      await createPlan.mutateAsync({
        planKey: planForm.planKey,
        name: planForm.name,
        description: planForm.description || null,
        maxActiveProjects: planForm.maxActiveProjects ? Number(planForm.maxActiveProjects) : null,
        maxActiveMembers: planForm.maxActiveMembers ? Number(planForm.maxActiveMembers) : null,
        storageLimitBytes: planForm.storageLimitGb
          ? Math.round(Number(planForm.storageLimitGb) * 1024 * 1024 * 1024)
          : null,
      });
      setShowCreate(false);
      setPlanForm({ planKey: "", name: "", description: "", maxActiveProjects: "", maxActiveMembers: "", storageLimitGb: "" });
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "Unable to create plan");
    }
  }

  async function saveAssignment() {
    if (!canUpdate || !summary.data || !selectedOrganizationId || !assignment.planId) return;
    setError("");
    setSavedOrganizationId("");
    if (assignment.endsAt && assignment.endsAt < assignment.startsAt) {
      setError("End date must be on or after start date.");
      return;
    }
    try {
      await assignSubscription.mutateAsync({
        planId: assignment.planId,
        status: assignment.status,
        startsAt: new Date(`${assignment.startsAt}T00:00:00`).toISOString(),
        endsAt: assignment.endsAt
          ? new Date(`${assignment.endsAt}T23:59:59`).toISOString()
          : null,
        internalNote: assignment.internalNote || null,
      });
      setSavedOrganizationId(selectedOrganizationId);
    } catch (assignmentError) {
      setError(assignmentError instanceof Error ? assignmentError.message : "Unable to assign subscription");
    }
  }

  return (
    <PermissionGuard permission="platform-subscriptions:read">
      <div className="space-y-4">
        <PageHeader
          title="Subscriptions"
          description="Configure capacity plans and manually provision customer organizations."
          actions={canUpdate ? <Button onClick={() => setShowCreate(true)}><Plus size={16} /> New Plan</Button> : undefined}
        />

        <AdministrationFilters
          name="plans"
          scope="Plan catalog for platform administrators. Capacity limits and assignments remain server-authoritative."
          search={{ value: planSearch, placeholder: "Plan name, key or description", onChange: setPlanSearch }}
          value={planFilters}
          fields={[{ key: "status", label: "Status", options: [{ value: "active", label: "Active" }, { value: "inactive", label: "Inactive" }] }]}
          onApply={(value) => setPlanFilters({ status: value.status ?? "" })}
        />

        <Card>
          <h2 className="mb-3 text-[18px] font-medium text-body">Plan catalog</h2>
          {plans.isPending ? <LoadingState label="Loading plans" /> : plans.isError ? <p role="alert" className="text-sm text-danger">Unable to load plans. <Button variant="outline" onClick={() => void plans.refetch()}>Retry</Button></p> : !visiblePlans.length ? <p className="text-sm text-sub">{plans.data.length ? "No plans match these filters." : "No plans have been created."}</p> :
          <Table>
            <TableHeader><TableRow><TableHead>Plan</TableHead><TableHead>Active Projects</TableHead><TableHead>Active Members</TableHead><TableHead>Storage</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
            <TableBody>
              {visiblePlans.map((plan) => (
                <TableRow key={plan.id}>
                  <TableCell><div className="font-medium text-body">{plan.name}</div><div className="text-[12px] text-sub">{plan.planKey}</div></TableCell>
                  <TableCell>{plan.maxActiveProjects ?? "Unlimited"}</TableCell>
                  <TableCell>{plan.maxActiveMembers ?? "Unlimited"}</TableCell>
                  <TableCell>{plan.storageLimitBytes === null ? "Not configured" : `${(plan.storageLimitBytes / 1024 / 1024 / 1024).toFixed(1)} GB`}</TableCell>
                  <TableCell><Badge variant={plan.isActive ? "success" : "outline"}>{plan.isActive ? "Active" : "Inactive"}</Badge></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          }
        </Card>

        <Card className="space-y-4">
          <div><h2 className="text-[18px] font-medium text-body">Organization provisioning</h2><p className="text-[13px] text-sub">Select an organization, then assign its current capacity plan.</p></div>
          <label className="grid gap-1 text-sm font-medium">Organization<Select value={selectedOrganizationId} onChange={(event) => { setSelectedOrganizationId(event.target.value); setAssignment({ planId: "", status: "ACTIVE", startsAt: today(), endsAt: "", internalNote: "" }); setSavedOrganizationId(""); setError(""); }}>
            <option value="">Select organization</option>
            {(organizations.data ?? []).map((organization) => <option key={organization.id} value={organization.id}>{organization.name} · {organization.type}</option>)}
          </Select></label>
          {organizations.isError && <p role="alert" className="text-sm text-danger">Unable to load organizations for provisioning.</p>}
          {selectedOrganizationId ? (
            <>
              {summary.isPending && <LoadingState label="Loading organization capacity" />}
              {summary.isError && <p role="alert" className="text-sm text-danger">Unable to load current capacity. Refresh before changing this assignment.</p>}
              {summary.data ? <div className="flex flex-wrap gap-2"><Badge variant="info">{summary.data.subscription?.plan.name ?? "Legacy compatible"}</Badge>{summary.data.subscription && <StatusBadge tone={subscriptionTone(summary.data.subscription.status)}>{summary.data.subscription.status}</StatusBadge>}<Badge variant="outline">{summary.data.usage.activeProjects} active projects</Badge><Badge variant="outline">{summary.data.usage.activeMembers} active members</Badge></div> : null}
              {canUpdate && summary.data && <section className="space-y-3 border-t border-hairline pt-4" aria-label="Subscription assignment">
                <h3 className="font-semibold">Assign capacity plan</h3>
                <p className="text-sm text-sub">This changes the selected organization’s capacity. Review the plan, status and dates before saving.</p>
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
                <label className="grid gap-1 text-sm font-medium">Plan<Select value={assignment.planId} onChange={(event) => setAssignment({ ...assignment, planId: event.target.value })}><option value="">Select plan</option>{(plans.data ?? []).filter((plan) => plan.isActive).map((plan) => <option key={plan.id} value={plan.id}>{plan.name}</option>)}</Select></label>
                <label className="grid gap-1 text-sm font-medium">Status<Select value={assignment.status} onChange={(event) => setAssignment({ ...assignment, status: event.target.value as SubscriptionStatus })}>{SUBSCRIPTION_STATUSES.map((status) => <option key={status} value={status}>{status}</option>)}</Select></label>
                <label className="grid gap-1 text-sm font-medium">Starts on<Input type="date" value={assignment.startsAt} onChange={(event) => setAssignment({ ...assignment, startsAt: event.target.value })} /></label>
                <label className="grid gap-1 text-sm font-medium">Ends on (optional)<Input type="date" min={assignment.startsAt} value={assignment.endsAt} onChange={(event) => setAssignment({ ...assignment, endsAt: event.target.value })} /></label>
              </div>
              <label className="grid gap-1 text-sm font-medium">Internal provisioning note<Input placeholder="Internal provisioning note" value={assignment.internalNote} onChange={(event) => setAssignment({ ...assignment, internalNote: event.target.value })} /></label>
              <Button disabled={!assignment.planId || assignSubscription.isPending} onClick={saveAssignment}>Save Subscription</Button>
              {savedOrganizationId === selectedOrganizationId && <p role="status" className="text-sm text-success">Subscription saved for this organization.</p>}
              </section>}
            </>
          ) : null}
        </Card>

        {error ? <Card role="alert" className="text-sm text-danger">{error}</Card> : null}

        {showCreate && canUpdate ? (
          <Dialog open title="Create Subscription Plan" description="Plan values remain configurable; blank capacity means unlimited." onOpenChange={(open) => !open && setShowCreate(false)} footer={<><Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button><Button type="submit" form="create-plan-form" disabled={createPlan.isPending}>Create Plan</Button></>}>
            <form id="create-plan-form" className="grid gap-3 md:grid-cols-2" onSubmit={submitPlan}>
              <label className="grid gap-1 text-sm font-medium">Plan key<Input required placeholder="Plan key" value={planForm.planKey} onChange={(event) => setPlanForm({ ...planForm, planKey: event.target.value })} /></label>
              <label className="grid gap-1 text-sm font-medium">Plan name<Input required placeholder="Plan name" value={planForm.name} onChange={(event) => setPlanForm({ ...planForm, name: event.target.value })} /></label>
              <label className="grid gap-1 text-sm font-medium">Max active projects (blank means unlimited)<Input type="number" min="1" placeholder="Max active projects" value={planForm.maxActiveProjects} onChange={(event) => setPlanForm({ ...planForm, maxActiveProjects: event.target.value })} /></label>
              <label className="grid gap-1 text-sm font-medium">Max active members (blank means unlimited)<Input type="number" min="1" placeholder="Max active members" value={planForm.maxActiveMembers} onChange={(event) => setPlanForm({ ...planForm, maxActiveMembers: event.target.value })} /></label>
              <label className="grid gap-1 text-sm font-medium">Storage allowance in GB<Input type="number" min="1" placeholder="Storage allowance (GB)" value={planForm.storageLimitGb} onChange={(event) => setPlanForm({ ...planForm, storageLimitGb: event.target.value })} /></label>
              <label className="grid gap-1 text-sm font-medium">Description<Input placeholder="Description" value={planForm.description} onChange={(event) => setPlanForm({ ...planForm, description: event.target.value })} /></label>
            </form>
          </Dialog>
        ) : null}
      </div>
    </PermissionGuard>
  );
}
