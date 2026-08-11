import { ClipboardCheck } from "lucide-react";
import { Badge } from "@/components/ui";

export function DashboardOverviewHeader() {
  return (
    <header className="flex min-w-0 flex-col gap-4 border-b border-hairline/80 pb-5 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <div className="mb-2 flex items-center gap-2">
          <span className="h-4 w-1 rounded-full bg-lime" aria-hidden="true" />
          <p className="text-[11px] font-bold uppercase tracking-[0.9px] text-success">
            Good morning
          </p>
        </div>
        <h1 className="text-[26px] font-semibold leading-tight tracking-[-0.015em] text-body sm:text-[32px]">
          Operations overview
        </h1>
        <p className="mt-1.5 max-w-2xl text-[13px] leading-5 text-sub sm:text-[14px]">
          Builder operations, approvals and site progress in one focused workspace.
        </p>
      </div>
      <Badge variant="warning" className="self-start px-3 py-1.5 font-medium sm:self-auto shadow-pill">
        <ClipboardCheck size={15} strokeWidth={2} aria-hidden="true" />
        8 approvals pending
      </Badge>
    </header>
  );
}
