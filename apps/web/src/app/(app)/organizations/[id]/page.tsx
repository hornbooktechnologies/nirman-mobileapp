import { OrganizationDetailPage } from "@/features/organizations";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function OrganizationPage({ params }: PageProps) {
  const { id } = await params;
  return <OrganizationDetailPage organizationId={id} />;
}
