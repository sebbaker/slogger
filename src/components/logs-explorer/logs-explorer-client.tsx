"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  endOfDay,
  format,
  startOfDay,
  startOfMonth,
  startOfWeek,
  subDays,
  subHours,
  subMinutes,
} from "date-fns";
import { CalendarIcon, Settings2 } from "lucide-react";
import type { DateRange } from "react-day-picker";
import { AuthGate } from "@/components/logs-explorer/auth-gate";
import { LogDetailPanel } from "@/components/logs-explorer/log-detail-panel";
import {
  type DisplayColumn,
  LogsTable,
} from "@/components/logs-explorer/logs-table";
import type {
  LogItem,
  LogsResponse,
  SourcesResponse,
} from "@/components/logs-explorer/types";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar";
import { Textarea } from "@/components/ui/textarea";

const API_KEY_STORAGE_KEY = "slogger_api_key";
const SETTINGS_STORAGE_KEY = "slogger_explorer_settings";
const DEFAULT_COLUMNS_CONFIG = [
  "Method: request.method",
  "Message: message, data.message, error, data.error",
].join("\n");

type Filters = {
  search: string;
  from: string;
  to: string;
  limit: number;
  offset: number;
};

const initialFilters: Filters = {
  search: "",
  from: "",
  to: "",
  limit: 100,
  offset: 0,
};

type StoredSettings = {
  columnsConfig?: string;
  selectedSources?: string[];
};

type DatePreset = {
  label: string;
  getRange: () => { from: string; to: string };
};

function toIsoValue(value: string): string {
  if (!value) {
    return "";
  }

  return new Date(value).toISOString();
}

function toLocalDateTimeValue(date: Date): string {
  const adjustedDate = new Date(
    date.getTime() - date.getTimezoneOffset() * 60_000,
  );
  return adjustedDate.toISOString().slice(0, 16);
}

function parseLocalDateTime(value: string): Date | undefined {
  if (!value) {
    return undefined;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return undefined;
  }

  return date;
}

function formatRangeButtonLabel(from: string, to: string): string {
  if (!from && !to) {
    return "Select date range";
  }

  const fromDate = parseLocalDateTime(from);
  const toDate = parseLocalDateTime(to);

  if (fromDate && toDate) {
    return `${format(fromDate, "MMM d, yyyy HH:mm")} - ${format(toDate, "MMM d, yyyy HH:mm")}`;
  }

  if (fromDate) {
    return `From ${format(fromDate, "MMM d, yyyy HH:mm")}`;
  }

  if (toDate) {
    return `Until ${format(toDate, "MMM d, yyyy HH:mm")}`;
  }

  return "Select date range";
}

const DATE_PRESETS: DatePreset[] = [
  {
    label: "Last 15 minutes",
    getRange: () => ({
      from: toLocalDateTimeValue(subMinutes(new Date(), 15)),
      to: toLocalDateTimeValue(new Date()),
    }),
  },
  {
    label: "Last 30 minutes",
    getRange: () => ({
      from: toLocalDateTimeValue(subMinutes(new Date(), 30)),
      to: toLocalDateTimeValue(new Date()),
    }),
  },
  {
    label: "Last hour",
    getRange: () => ({
      from: toLocalDateTimeValue(subHours(new Date(), 1)),
      to: toLocalDateTimeValue(new Date()),
    }),
  },
  {
    label: "Last 3 hours",
    getRange: () => ({
      from: toLocalDateTimeValue(subHours(new Date(), 3)),
      to: toLocalDateTimeValue(new Date()),
    }),
  },
  {
    label: "Last 6 hours",
    getRange: () => ({
      from: toLocalDateTimeValue(subHours(new Date(), 6)),
      to: toLocalDateTimeValue(new Date()),
    }),
  },
  {
    label: "Last 12 hours",
    getRange: () => ({
      from: toLocalDateTimeValue(subHours(new Date(), 12)),
      to: toLocalDateTimeValue(new Date()),
    }),
  },
  {
    label: "Last 24 hours",
    getRange: () => ({
      from: toLocalDateTimeValue(subHours(new Date(), 24)),
      to: toLocalDateTimeValue(new Date()),
    }),
  },
  {
    label: "Last 48 hours",
    getRange: () => ({
      from: toLocalDateTimeValue(subHours(new Date(), 48)),
      to: toLocalDateTimeValue(new Date()),
    }),
  },
  {
    label: "Last 7 days",
    getRange: () => ({
      from: toLocalDateTimeValue(subDays(new Date(), 7)),
      to: toLocalDateTimeValue(new Date()),
    }),
  },
  {
    label: "Last 14 days",
    getRange: () => ({
      from: toLocalDateTimeValue(subDays(new Date(), 14)),
      to: toLocalDateTimeValue(new Date()),
    }),
  },
  {
    label: "Last 30 days",
    getRange: () => ({
      from: toLocalDateTimeValue(subDays(new Date(), 30)),
      to: toLocalDateTimeValue(new Date()),
    }),
  },
  {
    label: "Today",
    getRange: () => ({
      from: toLocalDateTimeValue(startOfDay(new Date())),
      to: toLocalDateTimeValue(new Date()),
    }),
  },
  {
    label: "Yesterday",
    getRange: () => ({
      from: toLocalDateTimeValue(startOfDay(subDays(new Date(), 1))),
      to: toLocalDateTimeValue(endOfDay(subDays(new Date(), 1))),
    }),
  },
  {
    label: "This week",
    getRange: () => ({
      from: toLocalDateTimeValue(startOfWeek(new Date(), { weekStartsOn: 1 })),
      to: toLocalDateTimeValue(new Date()),
    }),
  },
  {
    label: "This month",
    getRange: () => ({
      from: toLocalDateTimeValue(startOfMonth(new Date())),
      to: toLocalDateTimeValue(new Date()),
    }),
  },
];

function parseColumnsConfig(config: string): DisplayColumn[] {
  const lines = config
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const columns: DisplayColumn[] = [];

  for (const line of lines) {
    const separator = line.indexOf(":");
    if (separator <= 0) {
      continue;
    }

    const label = line.slice(0, separator).trim();
    const paths = line
      .slice(separator + 1)
      .split(",")
      .map((path) => path.trim())
      .filter(Boolean);

    if (!label || paths.length === 0) {
      continue;
    }

    columns.push({ label, paths });
  }

  return columns;
}

export function LogsExplorerClient() {
  const [storedSettings] = useState<StoredSettings>(() => {
    if (typeof window === "undefined") {
      return {};
    }

    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!raw) {
      return {};
    }

    try {
      return JSON.parse(raw) as StoredSettings;
    } catch {
      return {};
    }
  });

  const [apiKey, setApiKey] = useState<string>(() => {
    if (typeof window === "undefined") {
      return "";
    }

    return localStorage.getItem(API_KEY_STORAGE_KEY) ?? "";
  });
  const [logs, setLogs] = useState<LogItem[]>([]);
  const [availableSources, setAvailableSources] = useState<string[]>([]);
  const [selectedSources, setSelectedSources] = useState<string[]>(
    () => storedSettings.selectedSources ?? [],
  );
  const [draftFilters, setDraftFilters] = useState<Filters>(initialFilters);
  const [appliedFilters, setAppliedFilters] = useState<Filters>(initialFilters);
  const [activeLog, setActiveLog] = useState<LogItem | null>(null);
  const [error, setError] = useState<string>("");

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [columnsConfig, setColumnsConfig] = useState(
    () => storedSettings.columnsConfig ?? DEFAULT_COLUMNS_CONFIG,
  );
  const [draftColumnsConfig, setDraftColumnsConfig] = useState(
    () => storedSettings.columnsConfig ?? DEFAULT_COLUMNS_CONFIG,
  );
  const [draftSources, setDraftSources] = useState<string[]>([]);

  const [dateRangeOpen, setDateRangeOpen] = useState(false);
  const [draftDateFrom, setDraftDateFrom] = useState("");
  const [draftDateTo, setDraftDateTo] = useState("");

  const displayColumns = useMemo(
    () => parseColumnsConfig(columnsConfig),
    [columnsConfig],
  );

  const calendarRange = useMemo<DateRange | undefined>(() => {
    const from = parseLocalDateTime(draftDateFrom);
    const to = parseLocalDateTime(draftDateTo);

    if (!from && !to) {
      return undefined;
    }

    return {
      from,
      to: to ?? from,
    };
  }, [draftDateFrom, draftDateTo]);

  const queryString = useMemo(() => {
    const params = new URLSearchParams();

    if (selectedSources.length > 0) {
      params.set("sources", selectedSources.join(","));
    }

    if (appliedFilters.search) {
      params.set("search", appliedFilters.search);
    }

    if (appliedFilters.from) {
      params.set("from", toIsoValue(appliedFilters.from));
    }

    if (appliedFilters.to) {
      params.set("to", toIsoValue(appliedFilters.to));
    }

    params.set("limit", String(appliedFilters.limit));
    params.set("offset", String(appliedFilters.offset));

    return params.toString();
  }, [appliedFilters, selectedSources]);

  const loadLogs = useCallback(async () => {
    if (!apiKey) {
      return;
    }

    setError("");

    const response = await fetch(`/api/logs?${queryString}`, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    });

    if (response.status === 401) {
      localStorage.removeItem(API_KEY_STORAGE_KEY);
      setApiKey("");
      setError("Your API key is invalid.");
      return;
    }

    if (!response.ok) {
      setError("Failed to load logs.");
      return;
    }

    const data = (await response.json()) as LogsResponse;
    setLogs(data.logs);
  }, [apiKey, queryString]);

  const loadSources = useCallback(async () => {
    if (!apiKey) {
      return;
    }

    const response = await fetch("/api/sources", {
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    });

    if (response.status === 401) {
      localStorage.removeItem(API_KEY_STORAGE_KEY);
      setApiKey("");
      setError("Your API key is invalid.");
      return;
    }

    if (!response.ok) {
      setError("Failed to load sources.");
      return;
    }

    const data = (await response.json()) as SourcesResponse;
    setAvailableSources(data.sources);
    setSelectedSources((prev) =>
      prev.filter((source) => data.sources.includes(source)),
    );
  }, [apiKey]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadLogs();
  }, [loadLogs]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void loadSources();
  }, [loadSources]);

  if (!apiKey) {
    return (
      <AuthGate
        onSubmit={(key) => {
          localStorage.setItem(API_KEY_STORAGE_KEY, key);
          setApiKey(key);
        }}
      />
    );
  }

  const allSourcesSelected =
    availableSources.length > 0 &&
    draftSources.length === availableSources.length;

  const handleSettingsOpenChange = (open: boolean) => {
    setSettingsOpen(open);
    if (open) {
      setDraftColumnsConfig(columnsConfig);
      setDraftSources(selectedSources);
    }
  };

  const openDateRangeDialog = () => {
    setDraftDateFrom(draftFilters.from);
    setDraftDateTo(draftFilters.to);
    setDateRangeOpen(true);
  };

  return (
    <SidebarProvider>
      <Sidebar collapsible="offcanvas" variant="inset">
        <SidebarHeader className="p-4 pb-2">
          <h1 className="text-lg font-semibold">Slogger Explorer</h1>
        </SidebarHeader>

        <SidebarContent>
          <SidebarGroup className="space-y-3 px-4 pb-4">
            <div className="space-y-2">
              <Label htmlFor="search">Search</Label>
              <Input
                id="search"
                placeholder="Full-text search"
                value={draftFilters.search}
                onChange={(event) =>
                  setDraftFilters((prev) => ({
                    ...prev,
                    search: event.target.value,
                  }))
                }
              />
            </div>

            <div className="space-y-2">
              <Label>Date range</Label>
              <Button
                className="w-full justify-start"
                onClick={openDateRangeDialog}
                type="button"
                variant="outline"
              >
                <CalendarIcon className="h-4 w-4" />
                <span className="truncate">
                  {formatRangeButtonLabel(draftFilters.from, draftFilters.to)}
                </span>
              </Button>
            </div>

            <div className="space-y-2">
              <Label htmlFor="limit">Limit</Label>
              <Input
                id="limit"
                max={1000}
                min={1}
                type="number"
                value={draftFilters.limit}
                onChange={(event) =>
                  setDraftFilters((prev) => ({
                    ...prev,
                    limit: Math.min(
                      1000,
                      Math.max(1, Number(event.target.value) || 100),
                    ),
                  }))
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="offset">Offset</Label>
              <Input
                id="offset"
                min={0}
                type="number"
                value={draftFilters.offset}
                onChange={(event) =>
                  setDraftFilters((prev) => ({
                    ...prev,
                    offset: Math.max(0, Number(event.target.value) || 0),
                  }))
                }
              />
            </div>

            <Button
              className="w-full"
              onClick={() => {
                setAppliedFilters(draftFilters);
              }}
              type="button"
            >
              Search
            </Button>

            <Dialog open={settingsOpen} onOpenChange={handleSettingsOpenChange}>
              <DialogTrigger asChild>
                <Button className="w-full" type="button" variant="outline">
                  <Settings2 className="h-4 w-4" />
                  Table Settings
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-5xl">
                <DialogHeader>
                  <DialogTitle>Table Settings</DialogTitle>
                  <DialogDescription>
                    Configure sources and display columns for your log table.
                  </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]">
                  <Card className="gap-0 py-0">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base">Sources</CardTitle>
                      <CardDescription>
                        Select one or more sources to query.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3 pb-4">
                      <div className="flex items-center gap-2 rounded-md border p-3">
                        <Checkbox
                          checked={allSourcesSelected}
                          id="sources-all"
                          onCheckedChange={(checked) =>
                            setDraftSources(checked ? availableSources : [])
                          }
                        />
                        <Label htmlFor="sources-all">All sources</Label>
                      </div>

                      <div className="rounded-md border">
                        <ScrollArea className="h-72">
                          <div className="space-y-2 p-3">
                            {availableSources.map((source) => {
                              const checked = draftSources.includes(source);
                              return (
                                <div
                                  key={source}
                                  className="flex items-center gap-2"
                                >
                                  <Checkbox
                                    checked={checked}
                                    id={`source-${source}`}
                                    onCheckedChange={(next) => {
                                      if (next) {
                                        setDraftSources((prev) => [
                                          ...prev,
                                          source,
                                        ]);
                                        return;
                                      }

                                      setDraftSources((prev) =>
                                        prev.filter((item) => item !== source),
                                      );
                                    }}
                                  />
                                  <Label htmlFor={`source-${source}`}>
                                    {source}
                                  </Label>
                                </div>
                              );
                            })}
                          </div>
                        </ScrollArea>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="gap-0 py-0">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base">Columns</CardTitle>
                      <CardDescription>
                        Format: Label: path.one, path.two. Time, Source, and
                        Full JSON are always shown.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="pb-4">
                      <Textarea
                        id="columns-config"
                        rows={16}
                        value={draftColumnsConfig}
                        onChange={(event) =>
                          setDraftColumnsConfig(event.target.value)
                        }
                      />
                    </CardContent>
                  </Card>
                </div>

                <DialogFooter>
                  <Button
                    className="sm:mr-auto"
                    onClick={() => {
                      localStorage.removeItem(API_KEY_STORAGE_KEY);
                      setApiKey("");
                      setSettingsOpen(false);
                    }}
                    type="button"
                    variant="destructive"
                  >
                    Clear API Key
                  </Button>
                  <DialogClose asChild>
                    <Button type="button" variant="secondary">
                      Cancel
                    </Button>
                  </DialogClose>
                  <Button
                    onClick={() => {
                      setSelectedSources(draftSources);
                      setColumnsConfig(draftColumnsConfig);
                      localStorage.setItem(
                        SETTINGS_STORAGE_KEY,
                        JSON.stringify({
                          columnsConfig: draftColumnsConfig,
                          selectedSources: draftSources,
                        } satisfies StoredSettings),
                      );
                      setAppliedFilters((prev) => ({ ...prev, offset: 0 }));
                      setDraftFilters((prev) => ({ ...prev, offset: 0 }));
                      setSettingsOpen(false);
                    }}
                    type="button"
                  >
                    Save
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {/* {error ? ( */}
            <Alert variant="destructive">
              <AlertDescription>{error}asdfafsd</AlertDescription>
            </Alert>
            {/*  ) : null} */}
          </SidebarGroup>
        </SidebarContent>
      </Sidebar>

      <SidebarInset
        className="max-h-[calc(100svh-1rem)] overflow-hidden overscroll-contain"
        // className="min-h-svh p-4 md:max-h-[calc(100svh-1rem)]"
      >
        {/* <div className="flex min-h-0 flex-1 flex-col gap-3">
          <div className="min-h-0 flex-1"> */}
        <LogsTable
          columns={displayColumns}
          logs={logs}
          onSelect={(log) => setActiveLog(log)}
        />
        {/* </div>
        </div> */}
      </SidebarInset>

      <Dialog open={dateRangeOpen} onOpenChange={setDateRangeOpen}>
        <DialogContent className="sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle>Select date range</DialogTitle>
            <DialogDescription>
              Pick a preset or choose a custom date range.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 lg:grid-cols-[220px_minmax(0,1fr)]">
            <div className="space-y-2">
              <p className="text-sm font-medium">Presets</p>
              <ScrollArea className="h-80 rounded-md border">
                <div className="space-y-1 p-2">
                  {DATE_PRESETS.map((preset) => (
                    <Button
                      key={preset.label}
                      className="w-full justify-start"
                      onClick={() => {
                        const range = preset.getRange();
                        setDraftDateFrom(range.from);
                        setDraftDateTo(range.to);
                      }}
                      type="button"
                      variant="ghost"
                    >
                      {preset.label}
                    </Button>
                  ))}
                </div>
              </ScrollArea>
            </div>

            <div className="space-y-3">
              <div className="rounded-md border">
                <Calendar
                  className="mx-auto"
                  mode="range"
                  numberOfMonths={2}
                  selected={calendarRange}
                  onSelect={(range) => {
                    if (!range?.from) {
                      setDraftDateFrom("");
                      setDraftDateTo("");
                      return;
                    }

                    setDraftDateFrom(
                      toLocalDateTimeValue(startOfDay(range.from)),
                    );
                    setDraftDateTo(
                      toLocalDateTimeValue(endOfDay(range.to ?? range.from)),
                    );
                  }}
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="from-datetime">From</Label>
                  <Input
                    id="from-datetime"
                    type="datetime-local"
                    value={draftDateFrom}
                    onChange={(event) => setDraftDateFrom(event.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="to-datetime">To</Label>
                  <Input
                    id="to-datetime"
                    type="datetime-local"
                    value={draftDateTo}
                    onChange={(event) => setDraftDateTo(event.target.value)}
                  />
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              onClick={() => {
                setDraftDateFrom("");
                setDraftDateTo("");
              }}
              type="button"
              variant="secondary"
            >
              Clear
            </Button>
            <DialogClose asChild>
              <Button type="button" variant="secondary">
                Cancel
              </Button>
            </DialogClose>
            <Button
              onClick={() => {
                setDraftFilters((prev) => ({
                  ...prev,
                  from: draftDateFrom,
                  to: draftDateTo,
                }));
                setDateRangeOpen(false);
              }}
              type="button"
            >
              Apply range
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <LogDetailPanel log={activeLog} onClose={() => setActiveLog(null)} />
    </SidebarProvider>
  );
}
