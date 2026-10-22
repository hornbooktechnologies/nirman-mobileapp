import { LeadDetailPage } from "@/features/sales/components/lead-detail-page";

type LeadDetailRouteProps = {
  params: Promise<{ id: string; leadId: string }>;
  searchParams: Promise<{ created?: string }>;
};

export default async function LeadDetailRoute({
  params,
  searchParams,
}: LeadDetailRouteProps) {
  const [{ id, leadId }, { created }] = await Promise.all([
    params,
    searchParams,
  ]);

  return (
    <LeadDetailPage
      projectId={id}
      leadId={leadId}
      created={created === "1"}
    />
  );
}
