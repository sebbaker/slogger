"use client";

import { Button } from "@/components/ui/button";

type PaginationControlsProps = {
  limit: number;
  offset: number;
  total: number;
  onChangeOffset: (offset: number) => void;
};

export function PaginationControls({ limit, offset, total, onChangeOffset }: PaginationControlsProps) {
  const page = Math.floor(offset / limit) + 1;
  const pageCount = Math.max(1, Math.ceil(total / limit));

  return (
    <div className="bg-card flex items-center justify-between rounded-md border p-3 text-sm">
      <div>
        Page {page} of {pageCount} ({total} rows)
      </div>
      <div className="flex gap-2">
        <Button
          disabled={offset === 0}
          onClick={() => onChangeOffset(Math.max(0, offset - limit))}
          variant="outline"
          type="button"
        >
          Previous
        </Button>
        <Button
          disabled={offset + limit >= total}
          onClick={() => onChangeOffset(offset + limit)}
          variant="outline"
          type="button"
        >
          Next
        </Button>
      </div>
    </div>
  );
}
