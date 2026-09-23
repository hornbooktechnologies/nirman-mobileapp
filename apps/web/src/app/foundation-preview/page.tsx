import { DashboardPreview } from "@/components/ui/__fixtures__/dashboard-preview";
import { FinancialPreview } from "@/components/ui/__fixtures__/financial-preview";
import { MaterialsExpensesPreview } from "@/components/ui/__fixtures__/materials-expenses-preview";
import { ActivityPreview } from "@/components/ui/__fixtures__/activity-preview";
import { WorkersPreview } from "@/components/ui/__fixtures__/workers-preview";
import { SalesPreview } from "@/components/ui/__fixtures__/sales-preview";
import { AdministrationPreview } from "@/components/ui/__fixtures__/administration-preview";
import { notFound } from "next/navigation";
import { CollectionPreview } from "@/components/ui/__fixtures__/collection-preview";

export default async function FoundationPreviewPage({
  searchParams,
}: {
  searchParams: Promise<{ frame?: string; phase?: string }>;
}) {
  if (process.env.NODE_ENV !== "development") notFound();
  if ((await searchParams).phase === "8") return <AdministrationPreview />;
  if ((await searchParams).phase === "7") return <SalesPreview />;
  if ((await searchParams).phase === "6") return <ActivityPreview />;
  if ((await searchParams).phase === "5") return <MaterialsExpensesPreview />;
  if ((await searchParams).phase === "4") return <FinancialPreview />;
  if ((await searchParams).phase === "3") return <DashboardPreview />;
  if ((await searchParams).phase === "2") return <WorkersPreview />;
  return <CollectionPreview framed={(await searchParams).frame === "1"} />;
}
