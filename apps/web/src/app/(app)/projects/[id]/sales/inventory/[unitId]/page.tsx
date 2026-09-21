import { UnitDetailPage } from "@/features/sales/components/unit-detail-page";
export default async function Page({
  params,
}: {
  params: Promise<{ id: string; unitId: string }>;
}) {
  const { id, unitId } = await params;
  return <UnitDetailPage projectId={id} unitId={unitId} />;
}
