import { BrochuresPage } from "@/features/sales/components/brochures-page";
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <BrochuresPage projectId={id} />;
}
