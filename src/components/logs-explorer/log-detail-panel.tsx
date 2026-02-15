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
      <DialogContent className="h-[85vh] max-w-4xl">
        {log ? (
          <>
            <DialogHeader>
              <DialogTitle>Log Detail</DialogTitle>
              <DialogDescription>
                {log.source} at {format(new Date(log.time), "yyyy-MM-dd HH:mm:ss")}
              </DialogDescription>
            </DialogHeader>
            <div className="text-muted-foreground mb-3 space-y-1 text-sm">
              <p>Created: {format(new Date(log.created_at), "yyyy-MM-dd HH:mm:ss")}</p>
            </div>
            <ScrollArea className="bg-muted/30 h-[calc(85vh-11rem)] rounded-md border p-3">
              <pre className="text-xs">{JSON.stringify(log.props, null, 2)}</pre>
            </ScrollArea>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
