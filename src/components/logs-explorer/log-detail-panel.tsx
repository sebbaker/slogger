"use client";

import { format } from "date-fns";
import type { LogItem } from "@/components/logs-explorer/types";

type LogDetailPanelProps = {
  log: LogItem | null;
  onClose: () => void;
};

export function LogDetailPanel({ log, onClose }: LogDetailPanelProps) {
  if (!log) {
    return null;
  }

  return (
    <aside className="fixed top-0 right-0 z-50 h-full w-full max-w-xl border-l border-slate-800 bg-slate-950 p-4 shadow-2xl">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white">Log Detail</h2>
        <button className="rounded border border-slate-700 px-3 py-1 text-sm text-slate-200" onClick={onClose} type="button">
          Close
        </button>
      </div>
      <div className="mb-3 space-y-1 text-sm text-slate-300">
        <p>Source: {log.source}</p>
        <p>Time: {format(new Date(log.time), "yyyy-MM-dd HH:mm:ss")}</p>
        <p>Created: {format(new Date(log.created_at), "yyyy-MM-dd HH:mm:ss")}</p>
      </div>
      <pre className="h-[calc(100%-8rem)] overflow-auto rounded border border-slate-800 bg-slate-900 p-3 text-xs text-slate-100">
        {JSON.stringify(log.props, null, 2)}
      </pre>
    </aside>
  );
}
