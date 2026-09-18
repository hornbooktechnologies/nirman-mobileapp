import { LeadsPage } from "@/features/sales/components/leads-page";
export default async function Page({ params }: { params: Promise<{id: string}> }) { const {id} = await params; return <LeadsPage projectId={id} />; }
