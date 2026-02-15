"use client";

import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { LogItem } from "@/components/logs-explorer/types";

type LogDetailPanelProps = {
  log: LogItem | null;
  onClose: () => void;
};

export function LogDetailPanel({ log, onClose }: LogDetailPanelProps) {
  return (
    <Dialog open={Boolean(log)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="flex h-[85vh] max-w-4xl flex-col gap-0 overflow-hidden p-0">
        {log ? (
          <>
            <DialogHeader className="border-b px-6 pt-6 pb-4">
              <DialogTitle>Log Detail</DialogTitle>
              <DialogDescription>
                {log.source} at {format(new Date(log.time), "yyyy-MM-dd HH:mm:ss")}
              </DialogDescription>
            </DialogHeader>
            <ScrollArea className="flex-1 px-6 py-4">
              <pre className="text-xs">{JSON.stringify(log.props, null, 2)}</pre>
            </ScrollArea>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
