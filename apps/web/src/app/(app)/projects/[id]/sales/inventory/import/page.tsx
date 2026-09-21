import { UnitImportPage } from "@/features/sales/components/unit-import-page";
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <UnitImportPage projectId={id} />;
}
