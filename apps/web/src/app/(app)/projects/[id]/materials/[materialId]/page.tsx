import { MaterialDetailPage } from "@/features/materials/components/material-detail-page";
export default async function Page({
  params,
}: {
  params: Promise<{ id: string; materialId: string }>;
}) {
  const { id, materialId } = await params;
  return <MaterialDetailPage projectId={id} id={materialId} />;
}
