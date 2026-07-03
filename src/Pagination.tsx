"use client";

import * as React from "react";
import { cn } from "./cn";
import { Button } from "./Button";
import { IconChevronLeft, IconChevronRight } from "./icons";

export interface PaginationProps {
  page: number; // 1-based
  pageSize: number;
  total?: number; // omit if unknown (server lists with 50-cap)
  onPageChange: (page: number) => void;
  /** Disable next when the current page returned fewer than pageSize rows. */
  hasNext?: boolean;
  className?: string;
}

// Pagination — Prev/Next with a range readout. Works both for known totals and
// for the app's bounded server lists (50-cap) where `total` is unknown: pass
// `hasNext` derived from row count.
export function Pagination({
  page,
  pageSize,
  total,
  onPageChange,
  hasNext,
  className,
}: PaginationProps) {
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = total !== undefined ? Math.min(page * pageSize, total) : page * pageSize;
  const canPrev = page > 1;
  const canNext =
    hasNext !== undefined ? hasNext : total !== undefined ? page * pageSize < total : true;

  return (
    <div className={cn("flex items-center justify-between gap-3", className)}>
      <p className="text-[13px] text-muted">
        <span className="num">{from}</span>–<span className="num">{to}</span>
        {total !== undefined && (
          <>
            {" of "}
            <span className="num">{total}</span>
          </>
        )}
      </p>
      <div className="flex items-center gap-2">
        <Button
          variant="secondary"
          size="sm"
          disabled={!canPrev}
          onClick={() => onPageChange(page - 1)}
          leftIcon={<IconChevronLeft size={16} />}
        >
          Prev
        </Button>
        <Button
          variant="secondary"
          size="sm"
          disabled={!canNext}
          onClick={() => onPageChange(page + 1)}
          rightIcon={<IconChevronRight size={16} />}
        >
          Next
        </Button>
      </div>
    </div>
  );
}
