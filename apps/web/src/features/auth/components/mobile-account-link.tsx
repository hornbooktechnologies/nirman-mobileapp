"use client";

export const playStoreUrl =
  "https://play.google.com/store/apps/details?id=com.hornbook.nirmansite";

type Props = { screen: "activate" | "reset-password"; token: string };

export function MobileAccountLink({ screen, token }: Props) {
  const nativeUrl = `nirmansite://${screen}?token=${encodeURIComponent(token)}`;

  function openApp(event: React.MouseEvent<HTMLAnchorElement>) {
    if (/Android/i.test(navigator.userAgent)) {
      event.preventDefault();
      window.location.href = `intent://${screen}?token=${encodeURIComponent(token)}#Intent;scheme=nirmansite;package=com.hornbook.nirmansite;S.browser_fallback_url=${encodeURIComponent(playStoreUrl)};end`;
    }
  }

  return (
    <div className="mt-4 space-y-2 border-t border-hairline pt-4 text-center">
      <a
        href={nativeUrl}
        onClick={openApp}
        className="inline-flex min-h-11 items-center rounded-inner px-4 text-[13px] font-semibold text-lime underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lime"
      >
        Open in NirmanSite app
      </a>
      <p className="text-[12px] leading-5 text-sub">
        New device?{" "}
        <a
          href={playStoreUrl}
          className="font-semibold underline underline-offset-4"
        >
          Get the Android app
        </a>
        , then return to this link to continue.
      </p>
    </div>
  );
}
