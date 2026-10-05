import Link from "next/link";
import { totalExpensesReturn } from "@/features/financial-return";
import { WagesPage } from "@/features/wages";
import { wageDirectSelection } from "@/features/wages/wage-display";

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ batchId?: string; wageItemId?: string; returnTo?: string }>;
};

export default async function WagesRoute({ params, searchParams }: PageProps) {
  const { id } = await params;
  const query = await searchParams;
  const selection = wageDirectSelection(query.batchId, query.wageItemId);
  const back = totalExpensesReturn(query.returnTo, id);
  return <div className="space-y-3">{back && <Link className="underline" href={back}>Back to Total Expenses</Link>}<WagesPage projectId={id} initialBatchId={selection.batchId} initialWageItemId={selection.wageItemId} /></div>;
}
