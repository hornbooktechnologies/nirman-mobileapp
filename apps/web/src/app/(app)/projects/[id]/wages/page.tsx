import { WagesPage } from "@/features/wages";
import { wageDirectSelection } from "@/features/wages/wage-display";

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ batchId?: string; wageItemId?: string }>;
};

export default async function WagesRoute({ params, searchParams }: PageProps) {
  const { id } = await params;
  const query = await searchParams;
  const selection = wageDirectSelection(query.batchId, query.wageItemId);
  return <WagesPage projectId={id} initialBatchId={selection.batchId} initialWageItemId={selection.wageItemId} />;
}
