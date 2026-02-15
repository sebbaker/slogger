"use client";

import { AuthGate } from "@/components/logs-explorer/auth-gate";
import { LogDetailPanel } from "@/components/logs-explorer/log-detail-panel";
import {
  LogsTable,
  type DisplayColumn,
} from "@/components/logs-explorer/logs-table";
import type {
  LogItem,
  LogsResponse,
  SourcesResponse,
} from "@/components/logs-explorer/types";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
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
  SidebarHeader,
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useIsMobile } from "@/hooks/use-mobile";
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
import {
  type KeyboardEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { DateRange } from "react-day-picker";

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
  streamingEnabled?: boolean;
  formFilters?: Filters;
  activeFilters?: Filters;
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

function normalizeFilters(value: Partial<Filters> | undefined): Filters {
  const limit = Number(value?.limit);
  const offset = Number(value?.offset);

  return {
    search: typeof value?.search === "string" ? value.search : "",
    from:
      typeof value?.from === "string" && parseLocalDateTime(value.from)
        ? value.from
        : "",
    to:
      typeof value?.to === "string" && parseLocalDateTime(value.to)
        ? value.to
        : "",
    limit: Math.min(1000, Math.max(1, Number.isFinite(limit) ? limit : 100)),
    offset: Math.max(0, Number.isFinite(offset) ? offset : 0),
  };
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
  const isMobile = useIsMobile();
  const [apiKey, setApiKey] = useState<string>("");
  const [logs, setLogs] = useState<LogItem[]>([]);
  const [availableSources, setAvailableSources] = useState<string[]>([]);
  const [selectedSources, setSelectedSources] = useState<string[]>([]);
  const [formFilters, setFormFilters] = useState<Filters>(initialFilters);
  const [activeFilters, setActiveFilters] = useState<Filters>(initialFilters);
  const [activeLog, setActiveLog] = useState<LogItem | null>(null);
  const [error, setError] = useState<string>("");

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [columnsConfig, setColumnsConfig] = useState(DEFAULT_COLUMNS_CONFIG);
  const [draftColumnsConfig, setDraftColumnsConfig] = useState(
    DEFAULT_COLUMNS_CONFIG,
  );
  const [draftSources, setDraftSources] = useState<string[]>([]);

  const [dateRangeOpen, setDateRangeOpen] = useState(false);
  const [draftDateFrom, setDraftDateFrom] = useState("");
  const [draftDateTo, setDraftDateTo] = useState("");
  const [streamingEnabled, setStreamingEnabled] = useState(false);
  const [debouncedLiveSearch, setDebouncedLiveSearch] = useState(
    initialFilters.search,
  );

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

  const effectiveFilters = streamingEnabled ? formFilters : activeFilters;
  const querySearch = streamingEnabled
    ? debouncedLiveSearch
    : effectiveFilters.search;

  useEffect(() => {
    const delayMs = streamingEnabled ? 350 : 0;
    const timeoutId = window.setTimeout(() => {
      setDebouncedLiveSearch(formFilters.search);
    }, delayMs);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [formFilters.search, streamingEnabled]);

  const queryString = useMemo(() => {
    const params = new URLSearchParams();

    if (selectedSources.length > 0) {
      params.set("sources", selectedSources.join(","));
    }

    if (querySearch) {
      params.set("search", querySearch);
    }

    if (effectiveFilters.from) {
      params.set("from", toIsoValue(effectiveFilters.from));
    }

    if (effectiveFilters.to) {
      params.set("to", toIsoValue(effectiveFilters.to));
    }

    params.set("limit", String(effectiveFilters.limit));
    params.set("offset", String(effectiveFilters.offset));

    return params.toString();
  }, [effectiveFilters, querySearch, selectedSources]);

  useEffect(() => {
    const storedApiKey = localStorage.getItem(API_KEY_STORAGE_KEY) ?? "";
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setApiKey(storedApiKey);

    const rawSettings = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!rawSettings) {
      return;
    }

    try {
      const parsed = JSON.parse(rawSettings) as StoredSettings;
      setSelectedSources(parsed.selectedSources ?? []);
      const nextColumnsConfig = parsed.columnsConfig ?? DEFAULT_COLUMNS_CONFIG;
      setColumnsConfig(nextColumnsConfig);
      setDraftColumnsConfig(nextColumnsConfig);
      setStreamingEnabled(parsed.streamingEnabled === true);
      const nextFormFilters = normalizeFilters(parsed.formFilters);
      const nextActiveFilters = normalizeFilters(
        parsed.activeFilters ?? parsed.formFilters,
      );
      setFormFilters(nextFormFilters);
      setActiveFilters(nextActiveFilters);
    } catch {
      // Ignore malformed persisted settings and continue with defaults.
    }
  }, []);

  useEffect(() => {
    if (!apiKey) {
      return;
    }

    localStorage.setItem(
      SETTINGS_STORAGE_KEY,
      JSON.stringify({
        columnsConfig,
        selectedSources,
        streamingEnabled,
        formFilters,
        activeFilters,
      } satisfies StoredSettings),
    );
  }, [
    activeFilters,
    apiKey,
    columnsConfig,
    formFilters,
    selectedSources,
    streamingEnabled,
  ]);

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

  useEffect(() => {
    if (!streamingEnabled) {
      return;
    }

    const intervalId = window.setInterval(() => {
      void loadLogs();
    }, 2_000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [loadLogs, streamingEnabled]);

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
    setDraftDateFrom(formFilters.from);
    setDraftDateTo(formFilters.to);
    setDateRangeOpen(true);
  };

  const applyFormFilters = () => {
    setActiveFilters(formFilters);
  };

  const handleFilterEnterKey = (event: KeyboardEvent<HTMLInputElement>) => {
    if (streamingEnabled) {
      return;
    }

    if (event.key !== "Enter") {
      return;
    }

    event.preventDefault();
    applyFormFilters();
  };

  return (
    <SidebarProvider className="overscroll-none overflow-hidden">
      <Sidebar collapsible="offcanvas" variant="inset">
        <SidebarHeader className="p-4 pb-2">
          <h1 className="text-lg font-semibold">Slogger</h1>
        </SidebarHeader>

        <SidebarContent>
          <SidebarGroup className="space-y-3 px-4 pb-4">
            <div className="space-y-2">
              <Label htmlFor="search">Search</Label>
              <Input
                id="search"
                placeholder="Full-text search"
                value={formFilters.search}
                onKeyDown={handleFilterEnterKey}
                onChange={(event) =>
                  setFormFilters((prev) => ({
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
                  {formatRangeButtonLabel(formFilters.from, formFilters.to)}
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
                value={formFilters.limit}
                onKeyDown={handleFilterEnterKey}
                onChange={(event) =>
                  setFormFilters((prev) => ({
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
                value={formFilters.offset}
                onKeyDown={handleFilterEnterKey}
                onChange={(event) =>
                  setFormFilters((prev) => ({
                    ...prev,
                    offset: Math.max(0, Number(event.target.value) || 0),
                  }))
                }
              />
            </div>

            <div className="flex items-center gap-2">
              <Button
                className="flex-1"
                disabled={streamingEnabled}
                onClick={applyFormFilters}
                type="button"
              >
                Search
              </Button>
              <div className="flex items-center gap-2 rounded-md border px-2 py-1">
                <Label className="text-xs" htmlFor="streaming-toggle">
                  Live
                </Label>
                <Switch
                  checked={streamingEnabled}
                  id="streaming-toggle"
                  onCheckedChange={(checked) => {
                    const isEnabled = checked === true;
                    setStreamingEnabled(isEnabled);
                    setActiveFilters(formFilters);
                  }}
                />
              </div>
            </div>

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
                  <section className="space-y-3 py-1">
                    <div>
                      <h3 className="text-base font-semibold">Sources</h3>
                      <p className="text-muted-foreground text-sm">
                        Select one or more sources to query.
                      </p>
                    </div>
                    <div className="space-y-3">
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
                    </div>
                  </section>

                  <section className="space-y-3 border-t pt-4 lg:border-l lg:border-t-0 lg:pt-1 lg:pl-4">
                    <div>
                      <h3 className="text-base font-semibold">Columns</h3>
                      <p className="text-muted-foreground text-sm">
                        Format: Label: path.one, path.two. Time, Source, and
                        Full JSON are always shown.
                      </p>
                    </div>
                    <div>
                      <Textarea
                        id="columns-config"
                        rows={16}
                        value={draftColumnsConfig}
                        onChange={(event) =>
                          setDraftColumnsConfig(event.target.value)
                        }
                      />
                    </div>
                  </section>
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
                          streamingEnabled,
                          formFilters,
                          activeFilters,
                        } satisfies StoredSettings),
                      );
                      setActiveFilters((prev) => ({ ...prev, offset: 0 }));
                      setFormFilters((prev) => ({ ...prev, offset: 0 }));
                      setSettingsOpen(false);
                    }}
                    type="button"
                  >
                    Save
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {error ? (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            ) : null}
          </SidebarGroup>
        </SidebarContent>
      </Sidebar>

      <SidebarInset className="relative overflow-hidden">
        <div className="border-b px-2 py-2 md:hidden">
          <div className="flex items-center gap-2">
            <SidebarTrigger />
            <span className="text-sm font-medium">Filters</span>
          </div>
        </div>

        <div className="absolute inset-0 top-[49px] md:top-0">
          <LogsTable
            columns={displayColumns}
            logs={logs}
            onSelect={(log) => setActiveLog(log)}
          />
        </div>
      </SidebarInset>

      <Dialog open={dateRangeOpen} onOpenChange={setDateRangeOpen}>
        <DialogContent className="sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle>Select date range</DialogTitle>
          </DialogHeader>

          <div className="grid gap-4 lg:grid-cols-[220px_minmax(0,1fr)]">
            <div className="space-y-2">
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
                  numberOfMonths={isMobile ? 1 : 2}
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
                setFormFilters((prev) => ({
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
