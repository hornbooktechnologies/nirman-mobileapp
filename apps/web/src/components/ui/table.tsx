import { forwardRef, type HTMLAttributes, type TdHTMLAttributes, type ThHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export const Table = forwardRef<
  HTMLTableElement,
  HTMLAttributes<HTMLTableElement>
>(({ className, ...props }, ref) => (
  <div className="w-full overflow-x-auto overflow-y-hidden rounded-inner border border-hairline bg-surface shadow-pill overscroll-x-contain [-webkit-overflow-scrolling:touch]">
    <table
      ref={ref}
      className={cn(
        "w-full min-w-[640px] border-collapse text-left text-[13.5px]",
        className,
      )}
      {...props}
    />
  </div>
));

Table.displayName = "Table";

export const TableHeader = forwardRef<
  HTMLTableSectionElement,
  HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <thead ref={ref} className={cn("bg-sunken/60 text-sub border-b border-hairline", className)} {...props} />
));

TableHeader.displayName = "TableHeader";

export const TableBody = forwardRef<
  HTMLTableSectionElement,
  HTMLAttributes<HTMLTableSectionElement>
>(({ className, ...props }, ref) => (
  <tbody ref={ref} className={cn("divide-y divide-hairline/60 text-body", className)} {...props} />
));

TableBody.displayName = "TableBody";

export const TableRow = forwardRef<
  HTMLTableRowElement,
  HTMLAttributes<HTMLTableRowElement>
>(({ className, ...props }, ref) => (
  <tr
    ref={ref}
    className={cn(
      "transition-colors duration-150 hover:bg-sunken/40",
      className,
    )}
    {...props}
  />
));

TableRow.displayName = "TableRow";

export const TableHead = forwardRef<
  HTMLTableCellElement,
  ThHTMLAttributes<HTMLTableCellElement>
>(({ className, ...props }, ref) => (
  <th
    ref={ref}
    className={cn(
      "whitespace-nowrap px-4 py-3 text-[11px] font-bold uppercase tracking-[0.8px] text-sub",
      className,
    )}
    {...props}
  />
));

TableHead.displayName = "TableHead";

export const TableCell = forwardRef<
  HTMLTableCellElement,
  TdHTMLAttributes<HTMLTableCellElement>
>(({ className, ...props }, ref) => (
  <td
    ref={ref}
    className={cn("min-w-0 px-4 py-3.5 align-middle text-body", className)}
    {...props}
  />
));

TableCell.displayName = "TableCell";
