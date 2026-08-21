import { WagesPage } from "@/features/wages";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function WagesRoute({ params }: PageProps) {
  const { id } = await params;
  return <WagesPage projectId={id} />;
}
