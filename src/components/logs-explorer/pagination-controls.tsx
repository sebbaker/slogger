"use client";

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
    <div className="flex items-center justify-between rounded-md border border-slate-800 bg-slate-900 p-3 text-sm text-slate-200">
      <div>
        Page {page} of {pageCount} ({total} rows)
      </div>
      <div className="flex gap-2">
        <button
          className="rounded border border-slate-700 px-3 py-1 disabled:opacity-50"
          disabled={offset === 0}
          onClick={() => onChangeOffset(Math.max(0, offset - limit))}
          type="button"
        >
          Previous
        </button>
        <button
          className="rounded border border-slate-700 px-3 py-1 disabled:opacity-50"
          disabled={offset + limit >= total}
          onClick={() => onChangeOffset(offset + limit)}
          type="button"
        >
          Next
        </button>
      </div>
    </div>
  );
}
