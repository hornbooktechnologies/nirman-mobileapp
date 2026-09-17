import { KharchiPage } from "@/features/kharchi/components/kharchi-page";
export default async function Page({ params }: { params: Promise<{ id: string; advanceId: string }> }) { const { id, advanceId } = await params; return <KharchiPage projectId={id} advanceId={advanceId} />; }
