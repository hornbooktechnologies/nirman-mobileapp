import { type ReactNode } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";

export interface DataTableColumn<TRow> {
  id: string;
  header: ReactNode;
  cell: (row: TRow, index: number) => ReactNode;
  className?: string;
  headerClassName?: string;
}

export function DataTable<TRow>({ columns, getRowKey, rows, empty, tableClassName }: { columns: Array<DataTableColumn<TRow>>; getRowKey: (row: TRow) => string; rows: TRow[]; empty?: ReactNode; tableClassName?: string }) {
  if (rows.length === 0 && empty) return <>{empty}</>;

  return (
    <Table className={cn("min-w-[820px]", tableClassName)}>
      <TableHeader>
        <TableRow>
          {columns.map((column) => (
            <TableHead key={column.id} className={column.headerClassName}>{column.header}</TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row, index) => (
          <TableRow key={getRowKey(row)}>
            {columns.map((column) => (
              <TableCell key={column.id} className={column.className}>{column.cell(row, index)}</TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
