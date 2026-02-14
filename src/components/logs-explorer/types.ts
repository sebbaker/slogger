export type LogItem = {
  id: string;
  source: string;
  props: unknown;
  time: string;
  created_at: string;
};

export type LogsResponse = {
  logs: LogItem[];
  total: number;
};

export type SourcesResponse = {
  sources: string[];
};
