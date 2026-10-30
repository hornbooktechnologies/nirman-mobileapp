"use client";

import {
  PROJECT_STATUSES,
  PROJECT_TEXT_LIMITS,
  type ProjectValidationField,
  PROJECT_TYPES,
  type ProjectStatus,
  type ProjectType,
} from "@nirman-app/shared";
import { FormField, Input, Select, Textarea } from "@/components/ui";
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
    name: form.name.trim(),
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

export function ProjectFormFields({ form, setForm, errors = {}, onBlur, allowArchivedStatus = false }: {
  form: ProjectInput;
  setForm: (form: ProjectInput) => void;
  errors?: Partial<Record<ProjectValidationField, string>>;
  onBlur?: (field: ProjectValidationField) => void;
  allowArchivedStatus?: boolean;
}) {
  const statuses = allowArchivedStatus ? PROJECT_STATUSES : PROJECT_STATUSES.filter((status) => status !== "ARCHIVED");
  const textFields = [
    ["name", "Project name"], ["projectCode", "Project code (optional)"],
    ["line1", "Address line 1"], ["line2", "Address line 2"],
    ["city", "City"], ["state", "State"], ["postalCode", "Postal code"],
  ] as const;
  const addressFields = new Set(["line1", "line2", "city", "state", "postalCode"]);
  function textField([field, label]: typeof textFields[number]) {
    const isAddress = addressFields.has(field);
    const value = { ...form.address, ...form }[field];
    return <FormField key={field} label={label} required={field === "name"} error={errors[field]}>{(props) => (
      <Input {...props} name={isAddress ? `address.${field}` : field} placeholder={label} required={field === "name"}
        maxLength={PROJECT_TEXT_LIMITS[field]} value={value ?? ""} onBlur={() => onBlur?.(field)}
        onChange={(event) => setForm(isAddress
          ? { ...form, address: { ...form.address, [field]: event.target.value } }
          : { ...form, [field]: event.target.value })} />
    )}</FormField>;
  }
  return <div className="grid gap-3 md:grid-cols-2">
    {textFields.slice(0, 2).map(textField)}
    <FormField label="Project type" required>{(props) => <Select {...props} name="type" required value={form.type} onChange={(event) => setForm({ ...form, type: event.target.value as ProjectType })}>{PROJECT_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}</Select>}</FormField>
    <FormField label="Project status">{(props) => <Select {...props} name="status" value={form.status} onChange={(event) => setForm({ ...form, status: event.target.value as ProjectStatus })}>{statuses.map((status) => <option key={status} value={status}>{status}</option>)}</Select>}</FormField>
    {textFields.slice(2).map(textField)}
    {([['startDate', 'Start date'], ['expectedCompletionDate', 'Expected completion date']] as const).map(([field, label]) =>
      <FormField key={field} label={label} error={errors[field]}>{(props) => <Input {...props} name={field} type="date" value={form[field] ?? ""} onBlur={() => onBlur?.(field)} onChange={(event) => setForm({ ...form, [field]: event.target.value })} />}</FormField>)}
    <FormField label="Description" error={errors.description} className="grid gap-1 md:col-span-2">{(props) => <Textarea {...props} name="description" maxLength={2000} value={form.description ?? ""} onBlur={() => onBlur?.('description')} onChange={(event) => setForm({ ...form, description: event.target.value })} />}</FormField>
  </div>;
}
