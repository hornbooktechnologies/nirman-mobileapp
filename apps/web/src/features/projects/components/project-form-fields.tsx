"use client";

import {
  PROJECT_STATUSES,
  PROJECT_TYPES,
  type ProjectStatus,
  type ProjectType,
} from "@nirman-app/shared";
import { Input, Select, Textarea } from "@/components/ui";
import type { ProjectInput } from "@/features/projects/types/projects.types";

export function emptyProjectForm(): ProjectInput {
  return {
    name: "",
    projectCode: "",
    type: "RESIDENTIAL",
    status: "DRAFT",
    address: {
      line1: "",
      line2: "",
      city: "",
      state: "",
      postalCode: "",
    },
    startDate: "",
    expectedCompletionDate: "",
    description: "",
  };
}

export function normalizeProjectInput(form: ProjectInput): ProjectInput {
  return {
    ...form,
    projectCode: form.projectCode || null,
    startDate: form.startDate || null,
    expectedCompletionDate: form.expectedCompletionDate || null,
    description: form.description || null,
    address: {
      line1: form.address?.line1 || null,
      line2: form.address?.line2 || null,
      city: form.address?.city || null,
      state: form.address?.state || null,
      postalCode: form.address?.postalCode || null,
      latitude: form.address?.latitude || null,
      longitude: form.address?.longitude || null,
    },
  };
}

export function ProjectFormFields({
  form,
  setForm,
  allowArchivedStatus = false,
}: {
  form: ProjectInput;
  setForm: (form: ProjectInput) => void;
  allowArchivedStatus?: boolean;
}) {
  const statuses = allowArchivedStatus
    ? PROJECT_STATUSES
    : PROJECT_STATUSES.filter((status) => status !== "ARCHIVED");

  return (
    <div className="grid gap-3 md:grid-cols-2">
      <Input
        placeholder="Project name"
        value={form.name}
        onChange={(event) => setForm({ ...form, name: event.target.value })}
        required
      />
      <Input
        placeholder="Project code"
        value={form.projectCode ?? ""}
        onChange={(event) => setForm({ ...form, projectCode: event.target.value })}
      />
      <Select
        value={form.type}
        onChange={(event) =>
          setForm({ ...form, type: event.target.value as ProjectType })
        }
      >
        {PROJECT_TYPES.map((type) => (
          <option key={type} value={type}>{type}</option>
        ))}
      </Select>
      <Select
        value={form.status}
        onChange={(event) =>
          setForm({ ...form, status: event.target.value as ProjectStatus })
        }
      >
        {statuses.map((status) => (
          <option key={status} value={status}>{status}</option>
        ))}
      </Select>
      <Input
        placeholder="Address line 1"
        value={form.address?.line1 ?? ""}
        onChange={(event) =>
          setForm({ ...form, address: { ...form.address, line1: event.target.value } })
        }
      />
      <Input
        placeholder="Address line 2"
        value={form.address?.line2 ?? ""}
        onChange={(event) =>
          setForm({ ...form, address: { ...form.address, line2: event.target.value } })
        }
      />
      <Input
        placeholder="City"
        value={form.address?.city ?? ""}
        onChange={(event) =>
          setForm({ ...form, address: { ...form.address, city: event.target.value } })
        }
      />
      <Input
        placeholder="State"
        value={form.address?.state ?? ""}
        onChange={(event) =>
          setForm({ ...form, address: { ...form.address, state: event.target.value } })
        }
      />
      <Input
        placeholder="Postal code"
        value={form.address?.postalCode ?? ""}
        onChange={(event) =>
          setForm({
            ...form,
            address: { ...form.address, postalCode: event.target.value },
          })
        }
      />
      <Input
        type="date"
        value={form.startDate ?? ""}
        onChange={(event) => setForm({ ...form, startDate: event.target.value })}
      />
      <Input
        type="date"
        value={form.expectedCompletionDate ?? ""}
        onChange={(event) =>
          setForm({ ...form, expectedCompletionDate: event.target.value })
        }
      />
      <Textarea
        className="md:col-span-2"
        placeholder="Description"
        value={form.description ?? ""}
        onChange={(event) => setForm({ ...form, description: event.target.value })}
      />
    </div>
  );
}
