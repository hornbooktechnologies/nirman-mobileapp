"use client";
/* eslint-disable @next/next/no-img-element -- Authenticated Blob URLs must stay local; no public image optimizer. */
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui";
import { galleryService } from "../services/gallery.service";
export function PrivateImage({ org, project, id, alt, full = false, onOpen }: { org: string; project: string; id: string; alt: string; full?: boolean; onOpen?: () => void }) {
  const element = useRef<HTMLDivElement>(null);
  const [attempt, setAttempt] = useState(0);
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");
  useEffect(() => {
    const controller = new AbortController(); let objectUrl = "";
    async function load() {
      try {
        const blob = await galleryService.media(org, project, id, controller.signal);
        if (controller.signal.aborted) return;
        objectUrl = URL.createObjectURL(blob); setUrl(objectUrl);
      } catch { if (!controller.signal.aborted) setError("Photo unavailable. Check your connection and access, then retry."); }
    }
    const observer = new IntersectionObserver(entries => { if (entries.some(e => e.isIntersecting)) { observer.disconnect(); void load(); } });
    if (element.current) observer.observe(element.current);
    return () => { controller.abort(); observer.disconnect(); if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [org, project, id, attempt]);
  return <div ref={element} className={`grid place-items-center overflow-hidden rounded-card bg-sunken ${full ? "min-h-64" : "aspect-square"}`}>
    {error ? <div className="p-3 text-sm"><p role="alert">{error}</p><Button variant="outline" onClick={() => { setError(""); setAttempt(x => x + 1); }}>Retry photo</Button></div> : url ? <button type="button" disabled={!onOpen} onClick={onOpen} aria-label={`Open ${alt}`} className="h-full w-full focus-visible:ring-2 focus-visible:ring-lime disabled:cursor-default"><img src={url} alt={alt} onError={() => setError("This image could not be displayed.")} className={full ? "max-h-[60vh] w-full object-contain" : "h-full w-full object-cover"} /></button> : <span role="status" className="p-3 text-sm text-sub">Loading photo…</span>}
  </div>;
}
