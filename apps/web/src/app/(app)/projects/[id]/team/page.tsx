import { ProjectTeamPage } from "@/features/projects/components/project-team-page";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ProjectTeamRoute({ params }: PageProps) {
  const { id } = await params;
  return <ProjectTeamPage projectId={id} />;
}

