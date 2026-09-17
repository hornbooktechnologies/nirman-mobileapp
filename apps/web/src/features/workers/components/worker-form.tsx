"use client";

import { useRef, useState, type FormEvent } from "react";
import { AlertTriangle } from "lucide-react";
import { Button, Card, Checkbox, Input, Textarea } from "@/components/ui";
import { workerToday, workerError } from "../worker-utils";
import { useAuth } from "@/features/auth/hooks/use-auth";
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
  dailyRate: "",
  startsOn: workerToday(),
  acknowledgeDuplicateWarning: false,
};

export function WorkerForm({
  organizationId,
  initialWorker,
  initialProjectId,
  isSaving,
  submitLabel,
  onSubmit,
  onBusyChange,
}: {
  organizationId: string;
  initialWorker?: WorkerDetail | null;
  initialProjectId?: string;
  isSaving: boolean;
  submitLabel: string;
  onSubmit: (input: WorkerFormState) => Promise<void>;
  onBusyChange?: (busy: boolean) => void;
}) {
  const { activeOrganizationTimezone } = useAuth();
  const busy = useRef(false);
  const errorRef = useRef<HTMLParagraphElement>(null);
  const [checking, setChecking] = useState(false);
  const [success, setSuccess] = useState("");
  const [form, setForm] = useState<WorkerFormState>({
    ...emptyWorkerForm,
    startsOn: workerToday(activeOrganizationTimezone ?? undefined),
    projectId: initialProjectId ?? "",
    name: initialWorker?.name ?? "",
    trade: initialWorker?.trade ?? "",
    dailyRate: initialWorker?.baseDailyRate ?? "",
    mobileNumber: initialWorker?.mobileNumber ?? "",
    notes: initialWorker?.notes ?? "",
  });
  const [duplicates, setDuplicates] = useState<WorkerDuplicateCandidate[]>([]);
  const [error, setError] = useState("");
  const hasInitialProject = Boolean(initialProjectId);

  async function checkDuplicates() {
    if (!organizationId || (!form.name.trim() && !form.mobileNumber)) return [];
    const candidates = await workersService.duplicateCandidates(
      organizationId,
      {
        name: form.name,
        mobileNumber: form.mobileNumber ?? undefined,
      },
    );
    const filtered = candidates.filter(
      (candidate) => candidate.id !== initialWorker?.id,
    );
    setDuplicates(filtered);
    return filtered;
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy.current || isSaving) return;
    busy.current = true;
    onBusyChange?.(true);
    setChecking(true); setError(""); setSuccess("");
    try {
      const candidates = await checkDuplicates();
      if (candidates.length > 0 && !form.acknowledgeDuplicateWarning) {
        throw new Error("Review and acknowledge possible duplicate workers before saving.");
      }
      await onSubmit({
        ...form,
        name: form.name.trim(), trade: form.trade.trim(),
        mobileNumber: form.mobileNumber?.trim() || null,
        notes: form.notes?.trim() || null,
        projectId: hasInitialProject ? form.projectId || null : null,
        dailyRate: form.dailyRate === "" ? null : form.dailyRate,
        startsOn: hasInitialProject ? form.startsOn || null : null,
      });
      setSuccess("Worker saved.");
    } catch (failure) {
      setError(workerError(failure));
      requestAnimationFrame(() => errorRef.current?.focus());
    } finally { busy.current = false; setChecking(false); onBusyChange?.(false); }
  }

  async function inspectDuplicates() {
    if (busy.current || isSaving) return;
    busy.current = true; onBusyChange?.(true); setChecking(true); setError(""); setSuccess("");
    try {
      const candidates = await checkDuplicates();
      if (!candidates.length) setSuccess("No possible duplicates found.");
    } catch (failure) { setError(workerError(failure)); }
    finally { busy.current = false; setChecking(false); onBusyChange?.(false); }
  }

  return (
    <form className="space-y-4 text-base" onSubmit={submit}>
      {error ? <p ref={errorRef} tabIndex={-1} role="alert" className="text-danger">{error}</p> : null}
      {success ? <p role="status" className="text-success">{success}</p> : null}
      <fieldset disabled={isSaving || checking} className="space-y-4">
      {initialWorker ? (
        <div className="grid gap-1 text-[13px]">
          <span className="text-sub">Worker code</span>
          <span className="font-semibold text-body">
            {initialWorker.workerCode}
          </span>
        </div>
      ) : null}
      {!initialWorker && hasInitialProject ? (
        <p className="text-[13px] text-sub">
          The assignment and initial primary-project allocation will start together on the actual project start date.
        </p>
      ) : null}

      <div className="grid gap-3 md:grid-cols-2">
        <label className="grid gap-1">Worker name *<Input
          maxLength={160}
          placeholder="Worker name"
          value={form.name}
          onChange={(event) =>
            setForm({
              ...form,
              name: event.target.value,
              acknowledgeDuplicateWarning: false,
            })
          }
          required
        />
        </label>
        <label className="grid gap-1">Trade or worker type *<Input
          maxLength={80}
          placeholder="Trade or worker type"
          list="worker-trade-suggestions"
          value={form.trade}
          onChange={(event) => setForm({ ...form, trade: event.target.value })}
          required
        />
        </label>
        <datalist id="worker-trade-suggestions">
          {TRADE_SUGGESTIONS.map((trade) => (
            <option key={trade} value={trade} />
          ))}
        </datalist>
        <label className="grid gap-1">Mobile number<Input
          type="tel" maxLength={20}
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
        </label>
        <label className="space-y-1">
          <span className="text-base font-medium text-body">
            Daily rate
          </span>
          <Input
            placeholder="Enter daily rate"
            type="number"
            min="0" step="0.01"
            value={form.dailyRate ?? ""}
            onChange={(event) =>
              setForm({ ...form, dailyRate: event.target.value })
            }
          />
          <span className="block text-sm leading-5 text-sub">
            Used automatically as the default when assigning this worker to a
            Project.
          </span>
        </label>
        {!initialWorker && hasInitialProject ? (
          <>
            <label className="space-y-1">
              <span className="text-base font-medium text-body">
                Actual project start date *
              </span>
              <Input
                type="date" required
                value={form.startsOn ?? ""}
                onChange={(event) =>
                  setForm({ ...form, startsOn: event.target.value })
                }
              />
            </label>
          </>
        ) : null}
      </div>

      <label className="grid gap-1">Notes<Textarea
        maxLength={2000}
        placeholder="Notes"
        value={form.notes ?? ""}
        onChange={(event) => setForm({ ...form, notes: event.target.value })}
      />

      </label>
      {duplicates.length > 0 ? (
        <Card
          variant="surface"
          className="space-y-3 border-amber-300 bg-amber-50/70"
        >
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
              setForm({
                ...form,
                acknowledgeDuplicateWarning: event.currentTarget.checked,
              })
            }
          />
        </Card>
      ) : null}



      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => void inspectDuplicates()}
        >
          Check duplicates
        </Button>
        <Button type="submit" disabled={isSaving}>
          {isSaving || checking ? "Saving…" : submitLabel}
        </Button>
      </div>
      </fieldset>
    </form>
  );
}
