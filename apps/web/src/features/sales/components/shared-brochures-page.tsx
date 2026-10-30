"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import type { PublicBrochureShareResponse } from "@nirman-app/shared";
import { Card, LoadingState } from "@/components/ui";

export function SharedBrochuresPage({ token }: { token: string }) {
  const [data, setData] = useState<PublicBrochureShareResponse | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    void fetch(`/api/v1/public/brochure-shares/${encodeURIComponent(token)}`, {
      signal: controller.signal,
      headers: { Accept: "application/json" },
    })
      .then(async (response) => {
        if (!response.ok)
          throw new Error(
            "This brochure link has expired or is no longer available.",
          );
        const payload = (await response.json()) as {
          data: PublicBrochureShareResponse;
        };
        setData(payload.data);
      })
      .catch((cause) => {
        if ((cause as DOMException).name !== "AbortError")
          setError((cause as Error).message);
      });
    return () => controller.abort();
  }, [token]);

  if (error)
    return (
      <main className="mx-auto grid min-h-dvh max-w-2xl place-items-center p-5">
        <Card className="space-y-3 text-center">
          <p className="text-sm font-semibold uppercase tracking-wider text-lime-sub">
            NirmanSite
          </p>
          <h1 className="text-2xl font-semibold">Brochures unavailable</h1>
          <p className="text-sub">{error}</p>
        </Card>
      </main>
    );
  if (!data)
    return (
      <main className="mx-auto grid min-h-dvh max-w-2xl place-items-center p-5">
        <LoadingState label="Preparing your brochures" />
      </main>
    );

  return (
    <main className="mx-auto min-h-dvh max-w-5xl space-y-6 p-5 py-10 sm:p-8">
      <header className="rounded-card bg-blueprint p-6 text-white shadow-floating sm:p-8">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#f3a564]">
          Prepared for you
        </p>
        <h1 className="mt-2 text-3xl font-semibold sm:text-4xl">
          Property brochures
        </h1>
        <p className="mt-3 max-w-2xl text-white/75">
          Review the selected project information, images, plans and videos from
          your sales contact.
        </p>
      </header>
      <section
        className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
        aria-label="Shared brochures"
      >
        {data.assets.map((asset) => {
          const media = `/api/v1/public/brochure-shares/${encodeURIComponent(token)}/assets/${encodeURIComponent(asset.id)}/media`;
          return (
            <Card
              key={asset.id}
              className="flex min-h-64 flex-col overflow-hidden p-0"
            >
              <div className="flex h-36 items-center justify-center bg-sunken">
                {asset.mimeType.startsWith("image/") ? (
                  <Image
                    src={media}
                    alt=""
                    width={640}
                    height={288}
                    unoptimized
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span className="rounded-inner bg-blueprint px-4 py-2 text-sm font-semibold text-white">
                    {asset.mimeType === "application/pdf" ? "PDF" : "VIDEO"}
                  </span>
                )}
              </div>
              <div className="flex flex-1 flex-col p-5">
                <h2 className="text-lg font-semibold">{asset.title}</h2>
                {asset.description && (
                  <p className="mt-2 text-sm text-sub">{asset.description}</p>
                )}
                <p className="mt-2 text-xs text-sub">
                  {(asset.byteSize / 1024 / 1024).toFixed(1)} MiB
                </p>
                <a
                  className="mt-auto inline-flex min-h-11 items-center justify-center rounded-xl bg-lime px-4 py-3 text-sm font-semibold text-lime-ink focus-visible:ring-2 focus-visible:ring-lime"
                  href={media}
                  target="_blank"
                  rel="noreferrer"
                >
                  Open file
                </a>
              </div>
            </Card>
          );
        })}
      </section>
      <footer className="border-t border-hairline pt-5 text-center text-sm text-sub">
        Shared securely with NirmanSite · This private link expires
        automatically.
      </footer>
    </main>
  );
}
