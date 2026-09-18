"use client";
import Link from "next/link";
import { Card, LoadingState } from "@/components/ui";
import { useProgressPortfolio } from "../hooks/use-progress";
import { stageLabel } from "../progress-rules";
import { dateLabel, Failure } from "./progress-ui";
export function ProgressPortfolio({ org }: { org: string }) {
  const query = useProgressPortfolio(org);
  if (query.isPending) return <LoadingState label="Loading progress portfolio" />;
  if (query.isError) return <Failure error={query.error} retry={() => void query.refetch()} />;
  return <section className="space-y-4"><h2 className="text-xl font-semibold">Active project progress</h2>{!query.data.length && <Card>No accessible active projects.</Card>}<div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{query.data.map(row => <Link key={row.projectId} href={`/projects/${row.projectId}/progress`} className="rounded-card border border-hairline bg-surface p-5 focus-visible:ring-2 focus-visible:ring-lime"><h3 className="font-semibold">{row.projectName}</h3><p className="text-sm text-sub">{row.projectCode}</p><p className="my-3 text-2xl font-semibold tabular-nums">{row.overallPercentage}%</p><p className="text-sm">{row.latestStage && row.latestUpdateDate ? `${stageLabel(row.latestStage)} · ${row.latestPercentage}% · ${dateLabel(row.latestUpdateDate)}` : "No updates recorded"}</p></Link>)}</div></section>;
}
