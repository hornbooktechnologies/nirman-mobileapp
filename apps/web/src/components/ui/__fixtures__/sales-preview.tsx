"use client";

import { useState } from "react";
import { Card } from "@/components/ui";
import { SalesFilters } from "@/features/sales/components/sales-filters";
import { Status } from "@/features/sales/components/sales-ui";

export function SalesPreview() {
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<Record<string, string>>({ stage: "" });
  return (
    <main className="mx-auto max-w-6xl space-y-6 p-4 sm:p-8">
      <h1 className="text-2xl font-semibold">Sales workflow preview</h1>
      <nav aria-label="Sales preview" className="flex flex-wrap gap-2">
        {["Inventory", "Bookings", "Leads", "Follow-ups", "Site Visits"].map((item) => (
          <span key={item} className={`inline-flex min-h-11 items-center rounded-xl border px-4 text-sm font-semibold ${item === "Leads" ? "border-lime bg-lime text-lime-ink" : "border-hairline text-sub"}`}>{item}</span>
        ))}
      </nav>
      <SalesFilters
        name="leads"
        search={{ value: search, placeholder: "Name, phone or email", onChange: setSearch }}
        value={filters}
        fields={[{ key: "stage", name: "Stage", options: ["NEW", "QUALIFIED", "BOOKED", "LOST"] }]}
        onApply={setFilters}
      />
      <section className="grid gap-4 lg:grid-cols-2" aria-label="Example Sales records">
        <Card className="space-y-3"><div className="flex flex-wrap justify-between gap-2"><h2 className="min-w-0 break-words text-lg font-semibold">Anita Patel and Family — unusually long customer name for narrow layouts</h2><Status value="QUALIFIED" /></div><p>+91 98765 43210</p><p className="text-sm text-sub">Owner: Sales team · Next: schedule site visit</p></Card>
        <Card className="space-y-3"><div className="flex flex-wrap justify-between gap-2"><h2 className="text-lg font-semibold">Unit A-1204</h2><Status value="AVAILABLE" /></div><p>Interest does not reserve this unit.</p><div className="flex flex-wrap gap-2"><Status value="HIGH_INTENT" /><Status value="BOOKED" /><Status value="CANCELLED" /></div></Card>
      </section>
      <p className="text-sm text-sub">Synthetic presentation fixture. No Sales records are loaded or changed.</p>
    </main>
  );
}
