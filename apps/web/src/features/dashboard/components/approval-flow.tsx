"use client";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  Button,
  Card,
  LoadingState,
  SectionHeader,
  StatusBadge,
} from "@/components/ui";
import { materialsService } from "@/features/materials/services/materials.service";
import { expensesService } from "@/features/expenses/services/expenses.service";
import {
  dashboardQueryKey,
  dashboardCount,
  assertPendingScope,
} from "../dashboard-rules";
type QueueRecord = {
  id: string;
  organizationId: string;
  projectId: string;
  title: string;
  status: string;
};
type QueuePage = { items: QueueRecord[]; total: number };
export function ApprovalFlow({
  userId,
  organizationId,
  projectId,
  permissions,
}: {
  userId: string;
  organizationId: string;
  projectId: string;
  permissions: readonly string[];
}) {
  const materials = permissions.includes("materials:read");
  const expenses = permissions.includes("expenses:read");
  if (!materials && !expenses)
    return (
      <Card>
        <SectionHeader
          title="Pending work"
          description="Approval queues are unavailable with your current project permissions."
        />
      </Card>
    );
  return (
    <section className="space-y-3" aria-label="Pending project work">
      <SectionHeader
        title="Pending work"
        description="Pending records across this project, not a personal approval assignment. Open a record to see permitted actions."
      />
      <div className="grid items-start gap-4 xl:grid-cols-3">
        {materials ? (
          <>
            <PendingQueue
              userId={userId}
              organizationId={organizationId}
              projectId={projectId}
              permissions={permissions}
              kind="verification"
            />
            <PendingQueue
              userId={userId}
              organizationId={organizationId}
              projectId={projectId}
              permissions={permissions}
              kind="final"
            />
          </>
        ) : null}
        {expenses ? (
          <PendingQueue
            userId={userId}
            organizationId={organizationId}
            projectId={projectId}
            permissions={permissions}
            kind="expenses"
          />
        ) : null}
      </div>
    </section>
  );
}
function PendingQueue({
  userId,
  organizationId,
  projectId,
  permissions,
  kind,
}: {
  userId: string;
  organizationId: string;
  projectId: string;
  permissions: readonly string[];
  kind: "verification" | "final" | "expenses";
}) {
  const status =
    kind === "expenses"
      ? "PENDING_APPROVAL"
      : kind === "verification"
        ? "PENDING_VERIFICATION"
        : "PENDING_FINAL";
  const title =
    kind === "expenses"
      ? "Expense approvals"
      : kind === "verification"
        ? "Material verification"
        : "Material final approval";
  const route = kind === "expenses" ? "expenses" : "materials";
  const query = useQuery({
    queryKey: [
      ...dashboardQueryKey(userId, organizationId, projectId, permissions),
      "pending",
      kind,
    ],
    enabled: Boolean(userId && organizationId && projectId),
    retry: false,
    queryFn: async ({ signal }): Promise<QueuePage> => {
      const response =
        kind === "expenses"
          ? await expensesService.list(
              organizationId,
              projectId,
              {
                status: "PENDING_APPROVAL",
                page: 1,
                pageSize: 5,
                sortBy: "updatedAt",
                sortOrder: "desc",
              },
              signal,
            )
          : await materialsService.list(
              organizationId,
              projectId,
              {
                status:
                  kind === "verification"
                    ? "PENDING_VERIFICATION"
                    : "PENDING_FINAL",
                page: 1,
                pageSize: 5,
                sortBy: "updatedAt",
                sortOrder: "desc",
              },
              signal,
            );
      assertPendingScope(response?.items, organizationId, projectId, status);
      return {
        total: response.pagination?.total,
        items: response.items.map((item) => ({
          id: item.id,
          organizationId: item.organizationId,
          projectId: item.projectId,
          title: "materialName" in item ? item.materialName : item.description,
          status: item.status,
        })),
      };
    },
  });
  return (
    <PendingQueueCard
      title={title}
      statusLabel={status.replaceAll("_", " ").toLowerCase()}
      loading={query.isPending}
      error={query.isError}
      page={query.isSuccess ? query.data : undefined}
      retry={() => void query.refetch()}
      listHref={`/projects/${encodeURIComponent(projectId)}/${route}?status=${status}`}
      recordHref={(id) =>
        `/projects/${encodeURIComponent(projectId)}/${route}/${encodeURIComponent(id)}`
      }
    />
  );
}
export function PendingQueueCard({
  title,
  statusLabel,
  loading,
  error,
  page,
  retry,
  listHref,
  recordHref,
}: {
  title: string;
  statusLabel: string;
  loading: boolean;
  error: boolean;
  page?: QueuePage;
  retry: () => void;
  listHref: string;
  recordHref: (id: string) => string;
}) {
  return (
    <Card className="space-y-3">
      <SectionHeader title={title} />
      {loading ? (
        <LoadingState label={`Loading ${title.toLowerCase()}`} />
      ) : error || !page ? (
        <div role="alert">
          <p className="text-sm text-sub">
            This queue is unavailable. No count is assumed.
          </p>
          <Button variant="outline" onClick={retry}>
            Retry {title.toLowerCase()}
          </Button>
        </div>
      ) : (
        <>
          <p className="text-[13px] text-sub">
            {dashboardCount(page.total) === "Unavailable"
              ? `Showing ${page.items.length} returned records; total unavailable.`
              : `Showing ${page.items.length} of ${dashboardCount(page.total)} matching project records.`}
          </p>
          {page.items.length ? (
            <ul className="divide-y divide-hairline">
              {page.items.map((item) => (
                <li key={item.id} className="space-y-2 py-3">
                  <Link
                    className="inline-flex min-h-11 items-center break-words text-sm font-medium underline"
                    href={recordHref(item.id)}
                  >
                    {item.title || "Open record"}
                  </Link>
                  <div>
                    <StatusBadge tone="pending">{statusLabel}</StatusBadge>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-sub">
              No records were returned for this queue.
            </p>
          )}
        </>
      )}
      <Link
        className="inline-flex min-h-11 items-center text-sm underline"
        href={listHref}
      >
        View full queue
      </Link>
    </Card>
  );
}
