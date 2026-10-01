import type { Metadata } from "next";
import { Manrope } from "next/font/google";
import { AppProviders } from "@/providers/app-providers";
import { brandAssets } from "@/theme";
import "./globals.css";

export const metadata: Metadata = {
  title: "NirmanSite",
  description: "Enterprise Builder SaaS platform",
  icons: {
    icon: { url: brandAssets.appIcon, type: "image/png" },
    shortcut: brandAssets.appIcon,
    apple: brandAssets.appIcon,
  },
};

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
  weight: ["400", "500", "600", "700"],
});

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={manrope.variable}>
      <body>
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
