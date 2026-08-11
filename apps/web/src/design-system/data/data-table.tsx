"use client";

import {
  type HTMLAttributes,
  type ReactNode,
  type TableHTMLAttributes,
  type TdHTMLAttributes,
  type ThHTMLAttributes,
} from "react";
import { ArrowDown, ArrowUp, ChevronsUpDown } from "lucide-react";
import styles from "./data-table.module.css";

function cx(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

export type SortDirection = "asc" | "desc";

export function DataTableFrame({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={cx(styles.frame, className)}>{children}</div>;
}

export function DataTableScroll({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={cx(styles.scroll, className)}>{children}</div>;
}

interface DataTableProps extends TableHTMLAttributes<HTMLTableElement> {
  density?: "default" | "compact";
}

export function DataTable({
  children,
  density = "default",
  className,
  ...props
}: DataTableProps) {
  return (
    <table
      {...props}
      className={cx(styles.table, className)}
      data-density={density}
    >
      {children}
    </table>
  );
}

export function DataTableHead({ children }: { children: ReactNode }) {
  return <thead className={styles.head}>{children}</thead>;
}

export function DataTableBody({ children }: { children: ReactNode }) {
  return <tbody>{children}</tbody>;
}

interface DataTableRowProps extends HTMLAttributes<HTMLTableRowElement> {
  selected?: boolean;
}

export function DataTableRow({
  children,
  selected = false,
  className,
  ...props
}: DataTableRowProps) {
  return (
    <tr
      {...props}
      className={cx(styles.row, className)}
      data-selected={selected || undefined}
    >
      {children}
    </tr>
  );
}

type Priority = "primary" | "secondary" | "tertiary";
type Pin = "select" | "primary" | "actions";

interface HeaderCellProps extends ThHTMLAttributes<HTMLTableCellElement> {
  priority?: Priority;
  pin?: Pin;
  align?: "left" | "center" | "right";
}

export function HeaderCell({
  children,
  priority = "primary",
  pin,
  align = "left",
  className,
  ...props
}: HeaderCellProps) {
  return (
    <th
      {...props}
      className={cx(styles.headerCell, className)}
      data-priority={priority}
      data-pin={pin}
      data-align={align}
    >
      {children}
    </th>
  );
}

interface DataCellProps extends TdHTMLAttributes<HTMLTableCellElement> {
  priority?: Priority;
  pin?: Pin;
  align?: "left" | "center" | "right";
}

export function DataCell({
  children,
  priority = "primary",
  pin,
  align = "left",
  className,
  ...props
}: DataCellProps) {
  return (
    <td
      {...props}
      className={cx(styles.dataCell, className)}
      data-priority={priority}
      data-pin={pin}
      data-align={align}
    >
      {children}
    </td>
  );
}

interface SortableHeaderProps {
  children: ReactNode;
  active?: boolean;
  direction?: SortDirection;
  onSort: () => void;
  align?: "left" | "right";
}

export function SortableHeader({
  children,
  active = false,
  direction = "asc",
  onSort,
  align = "left",
}: SortableHeaderProps) {
  const Icon = !active
    ? ChevronsUpDown
    : direction === "asc"
      ? ArrowUp
      : ArrowDown;

  return (
    <button
      type="button"
      className={styles.sortButton}
      data-align={align}
      onClick={onSort}
    >
      <span>{children}</span>
      <Icon aria-hidden="true" size={14} />
      <span className={styles.visuallyHidden}>
        {active
          ? `Sorted ${direction === "asc" ? "ascending" : "descending"}. Activate to change.`
          : "Not sorted. Activate to sort."}
      </span>
    </button>
  );
}

export function TableMessage({
  colSpan,
  children,
}: {
  colSpan: number;
  children: ReactNode;
}) {
  return (
    <tr>
      <td colSpan={colSpan} className={styles.messageCell}>
        {children}
      </td>
    </tr>
  );
}

