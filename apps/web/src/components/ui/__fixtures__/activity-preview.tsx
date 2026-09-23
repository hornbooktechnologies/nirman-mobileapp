"use client";

import { useState } from "react";
import { Card, StatusBadge } from "@/components/ui";
import { GalleryCollectionFilters, ProgressHistoryFilters, type GalleryFiltersValue, type ProgressHistoryFiltersValue } from "@/features/activity-collection-filters";
import { ProjectActivityNavigation } from "@/features/project-activity-navigation";

const label = (value: string) => value.replaceAll("_", " ").toLowerCase().replace(/^./, letter => letter.toUpperCase());

export function ActivityPreview() {
  const [progress, setProgress] = useState<ProgressHistoryFiltersValue>({});
  const [gallery, setGallery] = useState<GalleryFiltersValue>({});
  return <main className="mx-auto max-w-6xl space-y-8 p-4 sm:p-8">
    <h1 className="text-2xl font-semibold">Project activity preview</h1>
    <ProjectActivityNavigation projectId="preview" permissions={["progress:read", "gallery:read", "work-calendar:read", "attendance:read"]} current="progress" />
    <section className="space-y-3"><h2 className="text-lg font-semibold">Progress and update history</h2><div className="grid gap-3 sm:grid-cols-3"><Card><h3 className="font-semibold">Foundation</h3><p className="text-2xl font-semibold">75%</p><p className="text-sm text-sub">Latest update · 23 Sep 2026</p></Card><Card><h3 className="font-semibold">Structure</h3><p className="text-2xl font-semibold">0%</p><p className="text-sm text-sub">No update recorded</p></Card></div><ProgressHistoryFilters value={progress} onApply={setProgress} stageLabel={label} /><Card><h3 className="font-semibold">Foundation · 23 Sep 2026</h3><p>50% → 75%</p><p className="break-words">North retaining wall reinforcement completed after inspection.</p></Card></section>
    <section className="space-y-3"><h2 className="text-lg font-semibold">Project gallery</h2><GalleryCollectionFilters value={gallery} onApply={setGallery} label={label} /><h3 className="text-base font-semibold">September 2026 · Wed 23 Sep</h3><Card><div className="aspect-video rounded-inner bg-sunken" aria-hidden="true" /><h4 className="mt-3 font-semibold">Progress · Published</h4><p className="break-words">Long field caption showing the north retaining wall before the next concrete pour, including a second line of context that remains readable on a narrow screen.</p></Card></section>
    <section className="space-y-3"><h2 className="text-lg font-semibold">Work calendar meaning</h2><Card><div className="flex flex-wrap items-center justify-between gap-3"><h3 className="font-semibold">24 Sep 2026</h3><StatusBadge tone="neutral">Non-working day</StatusBadge></div><p className="mt-2">Organization override · Site closure</p><p className="text-sm text-sub">Project override &gt; Organization override &gt; weekly pattern</p></Card></section>
    <p className="text-sm text-sub">Synthetic presentation fixture. No API, media or calendar mutation is used.</p>
  </main>;
}
