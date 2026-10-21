import type { Metadata } from "next";
import { ActivationPage } from "@/features/activation";

export const metadata: Metadata = {
  title: "Activate account",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ token?: string | string[] }>;
}) {
  const { token } = await searchParams;
  return <ActivationPage token={typeof token === "string" ? token : ""} />;
}
