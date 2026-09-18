import { LeadDetailPage } from "@/features/sales/components/lead-detail-page";
export default async function Page({ params, searchParams }: { params: Promise<{id: string; leadId: string}>; searchParams: Promise<{created?: string}> }) { const {id,leadId} = await params; const {created} = await searchParams; return <LeadDetailPage projectId={id} leadId={leadId} created={created === "1"} />; }
