import { SiteVisitsPage } from "@/features/sales/components/site-visits-page";
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <SiteVisitsPage projectId={id} />;
}
