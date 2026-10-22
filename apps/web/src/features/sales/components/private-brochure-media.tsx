"use client";
/* eslint-disable @next/next/no-img-element -- Authenticated Blob URLs cannot use the public image optimizer. */
import { useEffect, useState } from "react";
import { Button } from "@/components/ui";
import { brochuresService } from "../services/brochures.service";

export function PrivateBrochureMedia({
  org,
  project,
  assetId,
  title,
  image,
}: {
  org: string;
  project: string;
  assetId: string;
  title: string;
  image: boolean;
}) {
  const [attempt, setAttempt] = useState(0);
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");
  const [opening, setOpening] = useState(false);

  useEffect(() => {
    if (!image) return;
    const controller = new AbortController();
    let objectUrl = "";
    void brochuresService
      .media(org, project, assetId, controller.signal)
      .then((blob) => {
        if (controller.signal.aborted) return;
        objectUrl = URL.createObjectURL(blob);
        setUrl(objectUrl);
      })
      .catch(() => {
        if (!controller.signal.aborted) setError("Preview unavailable.");
      });
    return () => {
      controller.abort();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [org, project, assetId, image, attempt]);

  async function openFile() {
    setOpening(true);
    setError("");
    try {
      const blob = await brochuresService.media(org, project, assetId);
      const objectUrl = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = objectUrl;
      anchor.target = "_blank";
      anchor.rel = "noreferrer";
      anchor.click();
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
    } catch {
      setError("Preview unavailable.");
    } finally {
      setOpening(false);
    }
  }

  if (error)
    return (
      <div className="grid h-36 place-items-center bg-sunken p-3 text-center text-sm">
        <div>
          <p role="alert">{error}</p>
          <Button
            variant="ghost"
            onClick={() => {
              setError("");
              setAttempt((value) => value + 1);
            }}
          >
            Retry
          </Button>
        </div>
      </div>
    );
  if (!image)
    return (
      <div className="grid h-36 place-items-center bg-sunken">
        <Button
          variant="outline"
          disabled={opening}
          onClick={() => void openFile()}
        >
          {opening ? "Opening…" : "Preview file"}
        </Button>
      </div>
    );
  if (!url)
    return (
      <div
        className="grid h-36 place-items-center bg-sunken text-sm text-sub"
        role="status"
      >
        Loading preview…
      </div>
    );
  return (
    <div className="relative flex h-36 items-center justify-center bg-sunken">
      {image ? (
        <img src={url} alt="" className="h-full w-full object-cover" />
      ) : null}
      <a
        className={
          image
            ? "absolute inset-0 focus-visible:ring-2 focus-visible:ring-lime"
            : "rounded-inner bg-blueprint px-4 py-2 text-sm font-semibold text-white"
        }
        href={url}
        target="_blank"
        rel="noreferrer"
        aria-label={`Preview ${title}`}
      >
        {image ? <span className="sr-only">Preview {title}</span> : "PREVIEW"}
      </a>
    </div>
  );
}
