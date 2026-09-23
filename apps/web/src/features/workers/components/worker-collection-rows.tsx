import Link from "next/link";
import {
  StatusBadge,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui";
import type { WorkerSummary } from "../types/workers.types";
import { workerRate } from "../worker-utils";
import {
  workerContextPresentation,
  type WorkerContext,
} from "../worker-list-query";

export function WorkerCollectionRows({
  visible,
  detailHref,
}: {
  visible: { worker: WorkerSummary; context: WorkerContext }[];
  detailHref: (id: string) => string;
}) {
  return (
    <>
      <div className="hidden md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Worker</TableHead>
              <TableHead>Project context</TableHead>
              <TableHead>Base daily rate</TableHead>
              <TableHead>Mobile</TableHead>
              <TableHead>Active assignments</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visible.map(({ worker, context }) => {
              const style = workerContextPresentation[context];
              return (
                <TableRow key={worker.id} className={style.className}>
                  <TableCell>
                    <Link
                      className="break-words font-medium underline"
                      href={detailHref(worker.id)}
                    >
                      {worker.name}
                    </Link>
                    <p className="text-[13px] text-sub">
                      {worker.workerCode} · {worker.trade}
                    </p>
                  </TableCell>
                  <TableCell>
                    <StatusBadge tone={style.tone}>{style.label}</StatusBadge>
                  </TableCell>
                  <TableCell>{workerRate(worker.baseDailyRate)}</TableCell>
                  <TableCell>{worker.mobileNumber ?? "—"}</TableCell>
                  <TableCell>{worker.activeAssignmentCount}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
      <ul className="grid gap-3 md:hidden">
        {visible.map(({ worker, context }) => {
          const style = workerContextPresentation[context];
          return (
            <li
              key={worker.id}
              className={`space-y-2 rounded-inner border border-hairline p-4 ${style.className}`}
            >
              <Link
                className="block break-words font-medium underline"
                href={detailHref(worker.id)}
              >
                {worker.name}
              </Link>
              <p className="text-[13px] text-sub">
                {worker.workerCode} · {worker.trade}
              </p>
              <StatusBadge tone={style.tone}>{style.label}</StatusBadge>
              <p className="text-sm">
                Base daily rate: {workerRate(worker.baseDailyRate)}
              </p>
              <p className="text-[13px] text-sub">
                {worker.activeAssignmentCount} active assignments ·{" "}
                {worker.mobileNumber ?? "No mobile number"}
              </p>
            </li>
          );
        })}
      </ul>
    </>
  );
}
