import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { notFound } from "next/navigation";
import theme from "@/design-system/foundation/contract-theme.module.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Projects design preview | NirmanSite",
  robots: { index: false, follow: false },
};

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--preview-font-inter",
});

export default function DesignPreviewLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const enabled =
    process.env.NODE_ENV === "development" ||
    process.env.DESIGN_PREVIEW_ENABLED === "true";

  if (!enabled) notFound();

  return (
    <div
      className={`${theme.previewTheme} ${inter.variable}`}
      data-design-preview-root
    >
      {children}
    </div>
  );
}
