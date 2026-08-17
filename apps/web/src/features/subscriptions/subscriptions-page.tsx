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
} from "@/components/ui";
import { useOrganizations } from "@/features/organizations/hooks/use-organizations";
import { PermissionGuard } from "@/features/user-management/components/permission-guard";
import {
  useAssignOrganizationSubscription,
  useCreateSubscriptionPlan,
  useOrganizationSubscription,
  useSubscriptionPlans,
} from "./hooks";

const today = () => new Date().toISOString().slice(0, 10);

export function SubscriptionsPage() {
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
    if (!selectedOrganizationId || !assignment.planId) return;
    setError("");
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
          actions={<Button onClick={() => setShowCreate(true)}><Plus size={16} /> New Plan</Button>}
        />

        <Card>
          <h2 className="mb-3 text-[18px] font-medium text-body">Plan catalog</h2>
          <Table>
            <TableHeader><TableRow><TableHead>Plan</TableHead><TableHead>Active Projects</TableHead><TableHead>Active Members</TableHead><TableHead>Storage</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
            <TableBody>
              {(plans.data ?? []).map((plan) => (
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
        </Card>

        <Card className="space-y-4">
          <div><h2 className="text-[18px] font-medium text-body">Organization provisioning</h2><p className="text-[13px] text-sub">Select an organization, then assign its current capacity plan.</p></div>
          <Select value={selectedOrganizationId} onChange={(event) => { setSelectedOrganizationId(event.target.value); setAssignment({ ...assignment, planId: "" }); }}>
            <option value="">Select organization</option>
            {(organizations.data ?? []).map((organization) => <option key={organization.id} value={organization.id}>{organization.name} · {organization.type}</option>)}
          </Select>
          {selectedOrganizationId ? (
            <>
              {summary.data ? <div className="flex flex-wrap gap-2"><Badge variant="info">{summary.data.subscription?.plan.name ?? "Legacy compatible"}</Badge><Badge variant="outline">{summary.data.usage.activeProjects} active projects</Badge><Badge variant="outline">{summary.data.usage.activeMembers} active members</Badge></div> : null}
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
                <Select value={assignment.planId} onChange={(event) => setAssignment({ ...assignment, planId: event.target.value })}><option value="">Select plan</option>{(plans.data ?? []).filter((plan) => plan.isActive).map((plan) => <option key={plan.id} value={plan.id}>{plan.name}</option>)}</Select>
                <Select value={assignment.status} onChange={(event) => setAssignment({ ...assignment, status: event.target.value as SubscriptionStatus })}>{SUBSCRIPTION_STATUSES.map((status) => <option key={status} value={status}>{status}</option>)}</Select>
                <Input type="date" value={assignment.startsAt} onChange={(event) => setAssignment({ ...assignment, startsAt: event.target.value })} />
                <Input type="date" min={assignment.startsAt} value={assignment.endsAt} onChange={(event) => setAssignment({ ...assignment, endsAt: event.target.value })} />
              </div>
              <Input placeholder="Internal provisioning note" value={assignment.internalNote} onChange={(event) => setAssignment({ ...assignment, internalNote: event.target.value })} />
              <Button disabled={!assignment.planId || assignSubscription.isPending} onClick={saveAssignment}>Save Subscription</Button>
            </>
          ) : null}
        </Card>

        {error ? <Card className="text-[13px] text-red-600">{error}</Card> : null}

        {showCreate ? (
          <Dialog open title="Create Subscription Plan" description="Plan values remain configurable; blank capacity means unlimited." onOpenChange={(open) => !open && setShowCreate(false)} footer={<><Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button><Button type="submit" form="create-plan-form" disabled={createPlan.isPending}>Create Plan</Button></>}>
            <form id="create-plan-form" className="grid gap-3 md:grid-cols-2" onSubmit={submitPlan}>
              <Input required placeholder="Plan key" value={planForm.planKey} onChange={(event) => setPlanForm({ ...planForm, planKey: event.target.value })} />
              <Input required placeholder="Plan name" value={planForm.name} onChange={(event) => setPlanForm({ ...planForm, name: event.target.value })} />
              <Input type="number" min="1" placeholder="Max active projects" value={planForm.maxActiveProjects} onChange={(event) => setPlanForm({ ...planForm, maxActiveProjects: event.target.value })} />
              <Input type="number" min="1" placeholder="Max active members" value={planForm.maxActiveMembers} onChange={(event) => setPlanForm({ ...planForm, maxActiveMembers: event.target.value })} />
              <Input type="number" min="1" placeholder="Storage allowance (GB)" value={planForm.storageLimitGb} onChange={(event) => setPlanForm({ ...planForm, storageLimitGb: event.target.value })} />
              <Input placeholder="Description" value={planForm.description} onChange={(event) => setPlanForm({ ...planForm, description: event.target.value })} />
            </form>
          </Dialog>
        ) : null}
      </div>
    </PermissionGuard>
  );
}

