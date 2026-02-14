"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AuthGate } from "@/components/logs-explorer/auth-gate";
import { LogDetailPanel } from "@/components/logs-explorer/log-detail-panel";
import { LogsTable } from "@/components/logs-explorer/logs-table";
import { PaginationControls } from "@/components/logs-explorer/pagination-controls";
import { SearchControls } from "@/components/logs-explorer/search-controls";
import { SourceFilter } from "@/components/logs-explorer/source-filter";
import type { LogItem, LogsResponse, SourcesResponse } from "@/components/logs-explorer/types";

const API_KEY_STORAGE_KEY = "slogger_api_key";

type Filters = {
  search: string;
  jsonPath: string;
  from: string;
  to: string;
  limit: number;
  offset: number;
};

const initialFilters: Filters = {
  search: "",
  jsonPath: "",
  from: "",
  to: "",
  limit: 100,
  offset: 0,
};

function toIsoValue(value: string): string {
  if (!value) {
    return "";
  }

  return new Date(value).toISOString();
}

export function LogsExplorerClient() {
  const [apiKey, setApiKey] = useState<string>(() => {
    if (typeof window === "undefined") {
      return "";
    }

    return localStorage.getItem(API_KEY_STORAGE_KEY) ?? "";
  });
  const [logs, setLogs] = useState<LogItem[]>([]);
  const [availableSources, setAvailableSources] = useState<string[]>([]);
  const [selectedSources, setSelectedSources] = useState<string[]>([]);
  const [filters, setFilters] = useState<Filters>(initialFilters);
  const [total, setTotal] = useState(0);
  const [activeLog, setActiveLog] = useState<LogItem | null>(null);
  const [error, setError] = useState<string>("");

  const queryString = useMemo(() => {
    const params = new URLSearchParams();

    if (selectedSources.length > 0) {
      params.set("sources", selectedSources.join(","));
    }

    if (filters.search) {
      params.set("search", filters.search);
    }

    if (filters.jsonPath) {
      params.set("json_path", filters.jsonPath);
    }

    if (filters.from) {
      params.set("from", toIsoValue(filters.from));
    }

    if (filters.to) {
      params.set("to", toIsoValue(filters.to));
    }

    params.set("limit", String(filters.limit));
    params.set("offset", String(filters.offset));

    return params.toString();
  }, [filters, selectedSources]);

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
    setTotal(data.total);
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
    setSelectedSources((prev) => prev.filter((source) => data.sources.includes(source)));
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

  return (
    <div className="flex min-h-screen flex-col gap-3 bg-slate-950 p-4">
      <header className="flex items-center justify-between rounded-md border border-slate-800 bg-slate-900 p-3">
        <h1 className="text-lg font-semibold text-white">Slogger Explorer</h1>
        <button
          className="rounded border border-slate-700 px-3 py-1 text-sm text-slate-100"
          onClick={() => {
            localStorage.removeItem(API_KEY_STORAGE_KEY);
            setApiKey("");
          }}
          type="button"
        >
          Clear API Key
        </button>
      </header>

      <SearchControls
        value={filters}
        onChange={(next) => setFilters(next)}
        onSubmit={() => {
          setFilters((prev) => ({ ...prev, offset: 0 }));
          void loadLogs();
        }}
      />

      <SourceFilter
        availableSources={availableSources}
        selectedSources={selectedSources}
        onChange={(next) => {
          setSelectedSources(next);
          setFilters((prev) => ({ ...prev, offset: 0 }));
        }}
      />

      {error ? <p className="rounded border border-rose-700 bg-rose-900/40 p-2 text-sm text-rose-200">{error}</p> : null}

      <LogsTable logs={logs} onSelect={(log) => setActiveLog(log)} />

      <PaginationControls
        limit={filters.limit}
        offset={filters.offset}
        total={total}
        onChangeOffset={(offset) => setFilters((prev) => ({ ...prev, offset }))}
      />

      <LogDetailPanel log={activeLog} onClose={() => setActiveLog(null)} />
    </div>
  );
}
