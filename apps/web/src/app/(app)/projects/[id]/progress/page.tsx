import { ProgressPage } from "@/features/progress/components/progress-page";
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ProgressPage projectId={id} />;
}
