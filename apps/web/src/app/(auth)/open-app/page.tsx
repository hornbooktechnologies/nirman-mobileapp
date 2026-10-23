import Link from "next/link";
import type { Metadata } from "next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui";
import { MobileAccountLink } from "@/features/auth/components/mobile-account-link";

export const metadata: Metadata = {
  title: "Continue in NirmanSite",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

export default async function OpenAppPage({
  searchParams,
}: {
  searchParams: Promise<{ screen?: string; token?: string }>;
}) {
  const { screen, token } = await searchParams;
  const valid =
    (screen === "activate" || screen === "reset-password") &&
    typeof token === "string" &&
    token.length > 0;
  return (
    <main className="grid min-h-screen place-items-center px-4 py-8">
      <Card className="w-full max-w-[440px]">
        <CardHeader>
          <CardTitle>Continue in NirmanSite</CardTitle>
        </CardHeader>
        <CardContent>
          {valid ? (
            <>
              <p className="text-[13px] leading-5 text-sub">
                Open the app to{" "}
                {screen === "activate"
                  ? "activate your account and set your password"
                  : "reset your password"}
                . You can also continue securely in your browser.
              </p>
              <MobileAccountLink screen={screen} token={token} />
              <Link
                className="mt-4 block rounded-inner px-4 py-3 text-center text-[13px] font-semibold text-body underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime"
                href={`/${screen}?token=${encodeURIComponent(token)}`}
              >
                Continue in browser
              </Link>
            </>
          ) : (
            <p role="alert" className="text-[13px] text-danger">
              This link is incomplete. Please open the full link from your
              invitation or password reset email.
            </p>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
