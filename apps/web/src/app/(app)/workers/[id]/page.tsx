import { WorkerDetailPage } from "@/features/workers/components/worker-detail-page";

export default async function WorkerDetailRoute({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <WorkerDetailPage workerId={id} />;
}
