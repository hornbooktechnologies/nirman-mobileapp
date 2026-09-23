"use client";

import { useState } from "react";
import { Card } from "@/components/ui";
import { MaterialsCollectionFilters, defaultMaterialsQuery } from "@/features/materials/components/materials-collection-filters";
import { ExpensesCollectionFilters, defaultExpensesQuery } from "@/features/expenses/components/expenses-collection-filters";
import type { MaterialsQuery } from "@/features/materials/types/materials.types";
import type { ExpensesQuery } from "@/features/expenses/types/expenses.types";

export function MaterialsExpensesPreview() {
  const [materials, setMaterials] = useState<MaterialsQuery>(defaultMaterialsQuery);
  const [expenses, setExpenses] = useState<ExpensesQuery>(defaultExpensesQuery);
  const [materialSearch, setMaterialSearch] = useState("");
  const [expenseSearch, setExpenseSearch] = useState("");
  return <main className="mx-auto max-w-6xl space-y-8 p-4 sm:p-8">
    <h1 className="text-2xl font-semibold">Materials and expenses preview</h1>
    <section className="space-y-3"><h2 className="text-lg font-semibold">Materials</h2><MaterialsCollectionFilters query={materials} search={materialSearch} onSearch={setMaterialSearch} onApply={setMaterials} members={[]} canReadMembers={false} memberSearch="" onMemberSearch={() => {}} />
      <Card className="space-y-3"><h3 className="break-words text-lg font-semibold">Structural steel reinforcement for the north retaining wall</h3><p>Awaiting final approval · Approval is not delivery</p><dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">{[["Requested", "120 bags"], ["Ordered", "0 bags"], ["Delivered", "0 bags"], ["Outstanding", "120 bags"]].map(([key, value]) => <div key={key}><dt className="text-sm text-sub">{key}</dt><dd className="font-semibold">{value}</dd></div>)}</dl></Card>
    </section>
    <section className="space-y-3"><h2 className="text-lg font-semibold">Site Expenses</h2><ExpensesCollectionFilters query={expenses} search={expenseSearch} onSearch={setExpenseSearch} onApply={setExpenses} members={[]} canReadMembers={false} memberSearch="" onMemberSearch={() => {}} />
      <Card className="space-y-3"><h3 className="break-words text-lg font-semibold">Temporary site lighting and safety equipment rental</h3><p>Pending approval · Needs authorized review</p><dl className="grid grid-cols-2 gap-3 sm:grid-cols-3">{[["Original amount", "₹12,000"], ["Signed adjustments", "₹0"], ["Recognized cost", "₹0"]].map(([key, value]) => <div key={key}><dt className="text-sm text-sub">{key}</dt><dd className="font-semibold tabular-nums">{value}</dd></div>)}</dl></Card>
    </section>
    <p className="text-sm text-sub">Synthetic presentation fixture. No API data or financial action is used.</p>
  </main>;
}
