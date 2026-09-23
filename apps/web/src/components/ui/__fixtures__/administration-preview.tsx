"use client";

import { useState } from "react";
import { Card, StatusBadge } from "@/components/ui";
import { AdministrationFilters } from "@/features/administration/administration-filters";

export function AdministrationPreview() {
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<Record<string, string>>({ status: "" });
  const normalizedSearch = search.trim().toLocaleLowerCase();
  const showBuilder = (!filters.status || filters.status === "ACTIVE") &&
    "Shree Ganesh Infrastructure and Development Private Limited".toLocaleLowerCase().includes(normalizedSearch);
  const showContractor = (!filters.status || filters.status === "SUSPENDED") &&
    "Example contractor".toLocaleLowerCase().includes(normalizedSearch);
  return <main className="mx-auto max-w-6xl space-y-6 p-4 sm:p-8">
    <h1 className="text-2xl font-semibold">Administration preview</h1>
    <p className="text-sm text-sub">Synthetic organization and member records for layout and filter review. No API or account changes.</p>
    <AdministrationFilters name="organizations" scope="Showing organizations available to this example account." search={{ value: search, placeholder: "Organization name", onChange: setSearch }} value={filters} fields={[{ key: "status", label: "Status", options: [{ value: "ACTIVE", label: "Active" }, { value: "SUSPENDED", label: "Suspended" }] }]} onApply={setFilters} />
    <section className="grid gap-4 md:grid-cols-2" aria-label="Example organizations">
      {showBuilder ? <Card className="space-y-3"><div className="flex flex-wrap items-start justify-between gap-2"><h2 className="min-w-0 break-words text-lg font-semibold">Shree Ganesh Infrastructure and Development Private Limited</h2><StatusBadge tone="active">Active</StatusBadge></div><p className="text-sm text-sub">Builder · Self-managed · Asia/Kolkata</p></Card> : null}
      {showContractor ? <Card className="space-y-3"><div className="flex flex-wrap items-start justify-between gap-2"><h2 className="text-lg font-semibold">Example contractor</h2><StatusBadge tone="warning">Suspended</StatusBadge></div><p className="text-sm text-sub">Organization status can affect every member’s access.</p></Card> : null}
      {!showBuilder && !showContractor ? <Card className="text-sm text-sub">No example organizations match these filters.</Card> : null}
    </section>
    <Card className="space-y-2"><h2 className="text-lg font-semibold">Member access</h2><p>Organization role: Site Supervisor</p><p>Project access: North Tower, East Annex</p><p className="text-sm text-sub">Organization role grants permissions; assignments choose where the member can work.</p></Card>
  </main>;
}
