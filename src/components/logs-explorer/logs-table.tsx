"use client";

import { format } from "date-fns";
import {
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { LogItem } from "@/components/logs-explorer/types";

export type DisplayColumn = {
  label: string;
  paths: string[];
};

type LogsTableProps = {
  logs: LogItem[];
  columns: DisplayColumn[];
  onSelect: (log: LogItem) => void;
};

function getPathValue(input: unknown, path: string): unknown {
  const segments = path
    .split(".")
    .map((segment) => segment.trim())
    .filter(Boolean);
  let current: unknown = input;

  for (const segment of segments) {
    if (
      current === null ||
      current === undefined ||
      typeof current !== "object"
    ) {
      return undefined;
    }

    current = (current as Record<string, unknown>)[segment];
  }

  return current;
}

function getColumnValue(log: LogItem, paths: string[]): string {
  for (const path of paths) {
    const value = getPathValue(log.props, path);
    if (value === undefined || value === null || value === "") {
      continue;
    }

    if (typeof value === "string") {
      return value;
    }

    return JSON.stringify(value);
  }

  return "-";
}

export function LogsTable({ logs, columns, onSelect }: LogsTableProps) {
  return (
    <div className="absolute inset-0 overflow-auto overscroll-none">
      <table className="w-full border-separate border-spacing-0 text-sm [&_th]:border-b [&_th]:border-border  [&_th+th]:border-border [&_td]:border-b [&_td]:border-border [&_td+td]:border-border">
        <TableHeader className="text-xs uppercase tracking-wide">
          <TableRow>
            <TableHead className="sticky top-0 z-20 bg-card w-44">
              Time
            </TableHead>
            <TableHead className="sticky top-0 z-20 bg-card w-40">
              Source
            </TableHead>
            {columns.map((column) => (
              <TableHead
                key={column.label}
                className="sticky top-0 z-20 bg-card"
              >
                {column.label}
              </TableHead>
            ))}
            <TableHead className="sticky top-0 z-20 bg-card min-w-96">
              Full JSON
            </TableHead>
          </TableRow>
        </TableHeader>

        <TableBody>
          {logs.map((log, index) => (
            <TableRow
              key={`${log.id}-${index}`}
              className="cursor-pointer"
              onClick={() => onSelect(log)}
            >
              <TableCell className="text-muted-foreground whitespace-nowrap">
                {format(new Date(log.time), "yyyy-MM-dd HH:mm:ss")}
              </TableCell>

              <TableCell className="whitespace-nowrap">{log.source}</TableCell>
              {columns.map((column) => (
                <TableCell
                  key={`${log.id}-${column.label}`}
                  className="text-muted-foreground max-w-80 truncate"
                >
                  {getColumnValue(log, column.paths)}
                </TableCell>
              ))}

              <TableCell className="text-muted-foreground max-w-xl truncate font-mono text-xs">
                {JSON.stringify(log.props)}
              </TableCell>
            </TableRow>
          ))}
          {logs.length === 0 ? (
            <TableRow>
              <TableCell
                className="text-muted-foreground py-6 text-center"
                colSpan={columns.length + 3}
              >
                No logs found.
              </TableCell>
            </TableRow>
          ) : null}
        </TableBody>
      </table>
    </div>
  );
}
