import { projectValidationIssues, type ProjectValidationField } from "@nirman-app/shared";
import type { ProjectInput } from "./types/projects.types";

const labels: Record<ProjectValidationField, string> = {
  name: "Project name", projectCode: "Project code", line1: "Address line 1", line2: "Address line 2",
  city: "City", state: "State", postalCode: "Postal code", description: "Description",
  startDate: "Start date", expectedCompletionDate: "Expected completion date",
};

export function validateProjectForm(form: ProjectInput) {
  const issues = projectValidationIssues({ ...form.address, ...form });
  return Object.fromEntries(Object.entries(issues).map(([field, issue]) => [field,
    issue.rule === "required" ? `${labels[field as ProjectValidationField]} is required.`
      : issue.rule === "maxLength" ? `Use no more than ${issue.limit} characters.`
      : issue.rule === "date" ? "Enter a valid date."
      : "Expected completion date cannot be before start date.",
  ]));
}
