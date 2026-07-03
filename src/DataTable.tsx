import * as React from "react";
import { cn } from "./cn";
import { Skeleton } from "./Skeleton";
import { EmptyState } from "./EmptyState";
import { IconArrowUp, IconArrowDown, IconAlert, IconInbox } from "./icons";
import { Button } from "./Button";

export type SortDirection = "asc" | "desc";

export interface Column<T> {
  /** Stable key — also used as the sort key reported to onSortChange. */
  key: string;
  header: React.ReactNode;
  /** Cell renderer. Receives the row. */
  cell: (row: T) => React.ReactNode;
  /** Right-align + apply mono `.num` (for IDs, dates, counts, money). */
  numeric?: boolean;
  /** Mark sortable — renders the sort affordance + makes header clickable. */
  sortable?: boolean;
  /** Fixed column width (e.g. "120px" or "20%"). */
  width?: string;
  /** Header/cell alignment override. */
  align?: "left" | "right" | "center";
  className?: string;
}

export interface DataTableProps<T> {
  columns: Column<T>[];
  rows: T[];
  /** Stable key extractor. */
  rowKey: (row: T, index: number) => string;
  density?: "comfortable" | "compact";
  /** Zebra striping. Default true. */
  zebra?: boolean;
  /** Sticky header — needs a height-bounded scroll container around the table. */
  stickyHeader?: boolean;
  loading?: boolean;
  /** Error message; takes precedence over rows/empty. */
  error?: React.ReactNode;
  /** Empty render override; defaults to a generic EmptyState. */
  empty?: React.ReactNode;
  /** Number of skeleton rows while loading. */
  skeletonRows?: number;
  /** Controlled sort state. */
  sort?: { key: string; direction: SortDirection } | null;
  onSortChange?: (next: { key: string; direction: SortDirection }) => void;
  /** Row click handler (adds hover affordance + role). */
  onRowClick?: (row: T) => void;
  /** Retry callback shown in the error state. */
  onRetry?: () => void;
  className?: string;
}

function alignClass(col: { numeric?: boolean; align?: "left" | "right" | "center" }) {
  const a = col.align ?? (col.numeric ? "right" : "left");
  return a === "right" ? "text-right" : a === "center" ? "text-center" : "text-left";
}

export function DataTable<T>({
  columns,
  rows,
  rowKey,
  density = "comfortable",
  zebra = true,
  stickyHeader = false,
  loading = false,
  error,
  empty,
  skeletonRows = 5,
  sort,
  onSortChange,
  onRowClick,
  onRetry,
  className,
}: DataTableProps<T>) {
  const cellPad = density === "compact" ? "px-3 py-2" : "px-4 py-3";
  const headPad = density === "compact" ? "px-3 py-2" : "px-4 py-2.5";

  function toggleSort(col: Column<T>) {
    if (!col.sortable || !onSortChange) return;
    const dir: SortDirection =
      sort?.key === col.key && sort.direction === "asc" ? "desc" : "asc";
    onSortChange({ key: col.key, direction: dir });
  }

  const colCount = columns.length;

  return (
    <div className={cn("w-full overflow-x-auto", className)}>
      <table className="w-full border-collapse text-left text-sm">
        <thead
          className={cn(
            stickyHeader ? "glass sticky top-0 z-10" : "bg-card",
          )}
        >
          <tr>
            {columns.map((col) => {
              const active = sort?.key === col.key;
              return (
                <th
                  key={col.key}
                  scope="col"
                  style={col.width ? { width: col.width } : undefined}
                  aria-sort={
                    col.sortable
                      ? active
                        ? sort!.direction === "asc"
                          ? "ascending"
                          : "descending"
                        : "none"
                      : undefined
                  }
                  className={cn(
                    headPad,
                    "border-b border-line text-[11px] font-medium uppercase tracking-[0.04em] text-muted",
                    alignClass(col),
                    col.sortable && "cursor-pointer select-none hover:text-ink",
                    col.className,
                  )}
                  onClick={() => toggleSort(col)}
                >
                  <span
                    className={cn(
                      "inline-flex items-center gap-1",
                      (col.align ?? (col.numeric ? "right" : "left")) === "right" &&
                        "flex-row-reverse",
                    )}
                  >
                    {col.header}
                    {col.sortable && (
                      <span className={cn("text-muted", active ? "opacity-100" : "opacity-35")}>
                        {active && sort!.direction === "desc" ? (
                          <IconArrowDown size={12} />
                        ) : (
                          <IconArrowUp size={12} />
                        )}
                      </span>
                    )}
                  </span>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {error ? (
            <tr>
              <td colSpan={colCount} className="px-4">
                <EmptyState
                  compact
                  icon={<IconAlert size={20} />}
                  title="Couldn’t load this data"
                  description={typeof error === "string" ? error : undefined}
                  action={
                    onRetry ? (
                      <Button size="sm" variant="secondary" onClick={onRetry}>
                        Try again
                      </Button>
                    ) : undefined
                  }
                />
                {typeof error !== "string" && error}
              </td>
            </tr>
          ) : loading ? (
            Array.from({ length: skeletonRows }).map((_, r) => (
              <tr key={`sk-${r}`} className="border-b border-line">
                {columns.map((col, c) => (
                  <td key={col.key} className={cn(cellPad, alignClass(col))}>
                    <Skeleton
                      h={12}
                      w={col.numeric ? "50%" : c === 0 ? "70%" : "85%"}
                      className={cn(col.numeric && "ml-auto")}
                    />
                  </td>
                ))}
              </tr>
            ))
          ) : rows.length === 0 ? (
            <tr>
              <td colSpan={colCount} className="px-4">
                {empty ?? (
                  <EmptyState
                    compact
                    icon={<IconInbox size={20} />}
                    title="Nothing here yet"
                    description="Records will appear here once they exist."
                  />
                )}
              </td>
            </tr>
          ) : (
            rows.map((row, i) => (
              <tr
                key={rowKey(row, i)}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                className={cn(
                  "border-b border-line transition-calm hover:bg-blue-soft/60",
                  zebra && i % 2 === 1 && "bg-canvas/60",
                  onRowClick && "cursor-pointer hover:bg-blue-soft",
                )}
              >
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={cn(
                      cellPad,
                      "text-ink",
                      alignClass(col),
                      col.numeric && "num",
                      col.className,
                    )}
                  >
                    {col.cell(row)}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
