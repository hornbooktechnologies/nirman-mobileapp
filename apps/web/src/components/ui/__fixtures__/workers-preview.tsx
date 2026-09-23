"use client";
import { useState } from "react";
import { WorkerCollectionRows } from "@/features/workers/components/worker-collection-rows";
import { AttendanceNavigation } from "@/features/attendance/components/attendance-navigation";
import {
  workerContextPresentation,
  matchesWorkerAssignment,
  type WorkerContext,
  type AssignmentFilter,
} from "@/features/workers/worker-list-query";
import {
  Button,
  Card,
  CollectionToolbar,
  CollectionPagination,
  FieldLabel,
  PageHeader,
  Select,
} from "@/components/ui";
import type { WorkerSummary } from "@/features/workers/types/workers.types";
const rows = Object.keys(workerContextPresentation).map((context, index) => ({
  context: context as WorkerContext,
  worker: {
    id: String(index),
    organizationId: "fixture",
    name:
      index === 0
        ? "Long worker name for wrapping verification across narrow project workspaces and tablet layouts"
        : `Fixture worker ${index + 1}`,
    workerCode: `W-00${index + 1}`,
    trade: "Mason",
    baseDailyRate: index === 3 ? null : "650",
    mobileNumber: null,
    notes: null,
    status: context === "inactive" ? "INACTIVE" : "ACTIVE",
    activeAssignmentCount: index < 3 ? 1 : 0,
    createdAt: "",
    updatedAt: "",
    deactivatedAt: null,
  } as WorkerSummary,
}));
export function WorkersPreview() {
  const [assignment, setAssignment] = useState<AssignmentFilter>("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(2);
  const [readOnly, setReadOnly] = useState(false);
  const visible = rows.filter(
    (row) =>
      matchesWorkerAssignment(row.context, assignment) &&
      row.worker.name.toLowerCase().includes(search.toLowerCase()),
  );
  return (
    <main className="space-y-4 p-4">
      <p className="text-sm text-sub">
        Development fixture: synthetic workers, no API or mutation calls.
        Production row/card and Attendance navigation components.
      </p>
      <PageHeader
        title="Workers"
        description="Assignment states and responsive collection checks"
      />
      <Card>
        <CollectionToolbar<{ assignment: AssignmentFilter }>
          name="workers"
          scope="Fixture organization · Long project name with assignment context"
          search={{
            value: search,
            onChange: (value) => {
              setSearch(value);
              setPage(1);
            },
          }}
          filters={{
            value: { assignment },
            defaults: { assignment: "all" },
            count: Number(assignment !== "all"),
            onApply: (value) => {
              setAssignment(value.assignment);
              setPage(1);
            },
            fields: (draft, setDraft, id) => (
              <div>
                <FieldLabel htmlFor={`${id}-assignment`}>
                  Assignment on this page
                </FieldLabel>
                <Select
                  id={`${id}-assignment`}
                  value={draft.assignment}
                  onChange={(event) =>
                    setDraft({
                      assignment: event.target.value as AssignmentFilter,
                    })
                  }
                >
                  <option value="all">All workers</option>
                  <option value="working_here">Working here</option>
                  <option value="assigned_here">Assigned here</option>
                  <option value="not_on_project">
                    Elsewhere or unassigned
                  </option>
                </Select>
              </div>
            ),
          }}
        />
      </Card>
      <Card>
        {visible.length ? (
          <WorkerCollectionRows
            visible={visible}
            detailHref={(id) => `#worker-${id}`}
          />
        ) : (
          <p>No matching workers on this page.</p>
        )}
      </Card>
      <CollectionPagination
        page={page}
        pageCount={3}
        total={47}
        onPageChange={setPage}
      />
      <Button variant="outline" onClick={() => setReadOnly(!readOnly)}>
        {readOnly
          ? "Show permitted recovery links"
          : "Show read-only navigation"}
      </Button>
      <AttendanceNavigation
        projectId="fixture-project"
        permissions={
          readOnly
            ? ["attendance:read"]
            : [
                "attendance:read",
                "attendance:mark",
                "projects:read",
                "workers:read",
                "workers:assign-project",
                "work-calendar:read",
              ]
        }
        calendarDate="2026-09-22"
        summaryHref="#summary"
        markHref="#mark"
        current="summary"
      />
    </main>
  );
}
