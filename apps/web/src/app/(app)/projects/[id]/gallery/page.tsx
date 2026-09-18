import { GalleryPage } from "@/features/gallery/components/gallery-page";
export default async function Page({ params }: { params: Promise<{ id: string }> }) { const { id } = await params; return <GalleryPage projectId={id} />; }
