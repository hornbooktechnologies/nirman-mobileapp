import { FollowUpsPage } from "@/features/sales/components/follow-ups-page";
export default async function Page({ params }: { params: Promise<{id: string}> }) { const {id} = await params; return <FollowUpsPage projectId={id} />; }
