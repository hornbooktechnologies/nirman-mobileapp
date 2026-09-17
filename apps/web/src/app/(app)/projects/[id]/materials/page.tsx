import { MaterialsPage } from "@/features/materials/components/materials-page";
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <MaterialsPage projectId={id} />;
}
