import { KharchiPage } from "@/features/kharchi/components/kharchi-page";
import { kharchiQueryFromUrl } from "@/features/kharchi/query";
export default async function Page({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { id } = await params;
  return <KharchiPage projectId={id} initialQuery={kharchiQueryFromUrl(await searchParams)} />;
}
