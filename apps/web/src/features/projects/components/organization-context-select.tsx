"use client";

import { Select } from "@/components/ui";
import { useOrganizations } from "@/features/organizations/hooks/use-organizations";
import { cn } from "@/lib/utils";

export function OrganizationContextSelect({
  organizationId,
  onChange,
  className,
}: {
  organizationId: string;
  onChange: (organizationId: string) => void;
  className?: string;
}) {
  const organizations = useOrganizations();

  return (
    <Select
      value={organizationId}
      onChange={(event) => onChange(event.target.value)}
      className={cn("w-full sm:w-[280px]", className)}
      aria-label="Organization"
    >
      <option value="">Select organization</option>
      {organizations.data?.map((organization) => (
        <option key={organization.id} value={organization.id}>
          {organization.name}
        </option>
      ))}
    </Select>
  );
}
