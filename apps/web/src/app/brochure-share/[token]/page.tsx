import type { Metadata } from "next";
import { SharedBrochuresPage } from "@/features/sales/components/shared-brochures-page";

export const metadata: Metadata = {
  title: "Shared property brochures · NirmanSite",
  robots: { index: false, follow: false },
};
export default async function Page({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  return <SharedBrochuresPage key={token} token={token} />;
}
