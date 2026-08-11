"use client";

import { useState, type FormEvent } from "react";
import { AlertTriangle } from "lucide-react";
import { Button, Card, Checkbox, Input, Textarea } from "@/components/ui";
import { workersService } from "@/features/workers/services/workers.service";
import type {
  CreateWorkerInput,
  WorkerDetail,
  WorkerDuplicateCandidate,
} from "@/features/workers/types/workers.types";

const TRADE_SUGGESTIONS = [
  "Mason",
  "Helper",
  "Carpenter",
  "Plumber",
  "Electrician",
  "Painter",
];

export type WorkerFormState = CreateWorkerInput;

export const emptyWorkerForm: WorkerFormState = {
  name: "",
  trade: "",
  mobileNumber: "",
  notes: "",
  projectId: "",
  roleLabel: "",
  dailyRate: "",
  startsOn: new Date().toISOString().slice(0, 10),
  acknowledgeDuplicateWarning: false,
};

export function WorkerForm({
  organizationId,
  initialWorker,
  initialProjectId,
  isSaving,
  submitLabel,
  onSubmit,
}: {
  organizationId: string;
  initialWorker?: WorkerDetail | null;
  initialProjectId?: string;
  isSaving: boolean;
  submitLabel: string;
  onSubmit: (input: WorkerFormState) => Promise<void>;
}) {
  const [form, setForm] = useState<WorkerFormState>({
    ...emptyWorkerForm,
    projectId: initialProjectId ?? "",
    name: initialWorker?.name ?? "",
    trade: initialWorker?.trade ?? "",
    mobileNumber: initialWorker?.mobileNumber ?? "",
    notes: initialWorker?.notes ?? "",
  });
  const [duplicates, setDuplicates] = useState<WorkerDuplicateCandidate[]>([]);
  const [error, setError] = useState("");
  const hasInitialProject = Boolean(initialProjectId);

  async function checkDuplicates() {
    if (!organizationId || (!form.name.trim() && !form.mobileNumber)) return [];
    const candidates = await workersService.duplicateCandidates(organizationId, {
      name: form.name,
      mobileNumber: form.mobileNumber ?? undefined,
    });
    const filtered = candidates.filter((candidate) => candidate.id !== initialWorker?.id);
    setDuplicates(filtered);
    return filtered;
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const candidates = await checkDuplicates();
    if (candidates.length > 0 && !form.acknowledgeDuplicateWarning) {
      setError("Review and acknowledge possible duplicate workers before saving.");
      return;
    }
    try {
      await onSubmit({
        ...form,
        mobileNumber: form.mobileNumber || null,
        notes: form.notes || null,
        projectId: hasInitialProject ? form.projectId || null : null,
        roleLabel: hasInitialProject ? form.roleLabel || null : null,
        dailyRate: hasInitialProject ? form.dailyRate || null : null,
        startsOn: hasInitialProject ? form.startsOn || null : null,
      });
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Unable to save worker",
      );
    }
  }

  return (
    <form className="space-y-4" onSubmit={submit}>
      {initialWorker ? (
        <div className="grid gap-1 text-[13px]">
          <span className="text-sub">Worker code</span>
          <span className="font-semibold text-body">{initialWorker.workerCode}</span>
        </div>
      ) : null}
      {!initialWorker && hasInitialProject ? (
        <p className="text-[13px] text-sub">
          This worker will also be assigned to the selected project.
        </p>
      ) : null}

      <div className="grid gap-3 md:grid-cols-2">
        <Input
          placeholder="Worker name"
          value={form.name}
          onChange={(event) =>
            setForm({ ...form, name: event.target.value, acknowledgeDuplicateWarning: false })
          }
          required
        />
        <Input
          placeholder="Trade or worker type"
          list="worker-trade-suggestions"
          value={form.trade}
          onChange={(event) => setForm({ ...form, trade: event.target.value })}
          required
        />
        <datalist id="worker-trade-suggestions">
          {TRADE_SUGGESTIONS.map((trade) => (
            <option key={trade} value={trade} />
          ))}
        </datalist>
        <Input
          placeholder="Mobile number"
          value={form.mobileNumber ?? ""}
          onChange={(event) =>
            setForm({
              ...form,
              mobileNumber: event.target.value,
              acknowledgeDuplicateWarning: false,
            })
          }
        />
        {!initialWorker && hasInitialProject ? (
          <>
            <Input
              placeholder="Daily rate"
              type="number"
              min="0"
              value={form.dailyRate ?? ""}
              onChange={(event) => setForm({ ...form, dailyRate: event.target.value })}
            />
            <Input
              placeholder="Assignment role label"
              value={form.roleLabel ?? ""}
              onChange={(event) => setForm({ ...form, roleLabel: event.target.value })}
            />
            <Input
              type="date"
              value={form.startsOn ?? ""}
              onChange={(event) => setForm({ ...form, startsOn: event.target.value })}
            />
          </>
        ) : null}
      </div>

      <Textarea
        placeholder="Notes"
        value={form.notes ?? ""}
        onChange={(event) => setForm({ ...form, notes: event.target.value })}
      />

      {duplicates.length > 0 ? (
        <Card variant="surface" className="space-y-3 border-amber-300 bg-amber-50/70">
          <div className="flex items-start gap-2 text-[13px] font-semibold text-amber-900">
            <AlertTriangle size={16} />
            Possible duplicate workers
          </div>
          <div className="space-y-2 text-[13px] text-amber-950">
            {duplicates.map((candidate) => (
              <div key={candidate.id}>
                {candidate.workerCode} - {candidate.name} - {candidate.trade}
              </div>
            ))}
          </div>
          <Checkbox
            label="Continue with this worker record"
            checked={Boolean(form.acknowledgeDuplicateWarning)}
            className="text-amber-950"
            onChange={(event) =>
              setForm({ ...form, acknowledgeDuplicateWarning: event.currentTarget.checked })
            }
          />
        </Card>
      ) : null}

      {error ? <p className="text-[13px] text-red-600">{error}</p> : null}

      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" onClick={() => void checkDuplicates()}>
          Check duplicates
        </Button>
        <Button type="submit" disabled={isSaving}>
          {isSaving ? "Saving" : submitLabel}
        </Button>
      </div>
    </form>
  );
}
