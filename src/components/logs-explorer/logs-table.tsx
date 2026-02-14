"use client";

import { format } from "date-fns";
import type { LogItem } from "@/components/logs-explorer/types";

type LogsTableProps = {
  logs: LogItem[];
  onSelect: (log: LogItem) => void;
};

export function LogsTable({ logs, onSelect }: LogsTableProps) {
  return (
    <div className="flex-1 overflow-auto rounded-md border border-slate-800 bg-slate-900">
      <table className="w-full text-left text-sm text-slate-200">
        <thead className="sticky top-0 bg-slate-950 text-xs uppercase tracking-wide text-slate-400">
          <tr>
            <th className="px-3 py-2">Time</th>
            <th className="px-3 py-2">Source</th>
            <th className="px-3 py-2">Preview</th>
          </tr>
        </thead>
        <tbody>
          {logs.map((log, index) => (
            <tr
              key={`${log.id}-${index}`}
              className="cursor-pointer border-t border-slate-800 hover:bg-slate-800"
              onClick={() => onSelect(log)}
            >
              <td className="px-3 py-2">{format(new Date(log.time), "yyyy-MM-dd HH:mm:ss")}</td>
              <td className="px-3 py-2">{log.source}</td>
              <td className="max-w-xl truncate px-3 py-2 text-slate-300">
                {JSON.stringify(log.props)}
              </td>
            </tr>
          ))}
          {logs.length === 0 ? (
            <tr>
              <td className="px-3 py-6 text-center text-slate-400" colSpan={3}>
                No logs found.
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  );
}
