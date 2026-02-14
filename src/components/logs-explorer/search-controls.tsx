"use client";

type SearchFilters = {
  search: string;
  jsonPath: string;
  from: string;
  to: string;
  limit: number;
  offset: number;
};

type SearchControlsProps = {
  value: SearchFilters;
  onChange: (next: SearchFilters) => void;
  onSubmit: () => void;
};

export function SearchControls({ value, onChange, onSubmit }: SearchControlsProps) {
  return (
    <div className="grid gap-2 rounded-md border border-slate-800 bg-slate-900 p-3 md:grid-cols-6">
      <input
        className="rounded border border-slate-700 bg-slate-950 px-2 py-1 text-sm text-slate-100"
        placeholder="Full-text search"
        value={value.search}
        onChange={(event) => onChange({ ...value, search: event.target.value })}
      />
      <input
        className="rounded border border-slate-700 bg-slate-950 px-2 py-1 text-sm text-slate-100"
        placeholder="JSONPath"
        value={value.jsonPath}
        onChange={(event) => onChange({ ...value, jsonPath: event.target.value })}
      />
      <input
        className="rounded border border-slate-700 bg-slate-950 px-2 py-1 text-sm text-slate-100"
        type="datetime-local"
        value={value.from}
        onChange={(event) => onChange({ ...value, from: event.target.value })}
      />
      <input
        className="rounded border border-slate-700 bg-slate-950 px-2 py-1 text-sm text-slate-100"
        type="datetime-local"
        value={value.to}
        onChange={(event) => onChange({ ...value, to: event.target.value })}
      />
      <input
        className="rounded border border-slate-700 bg-slate-950 px-2 py-1 text-sm text-slate-100"
        type="number"
        min={1}
        max={1000}
        value={value.limit}
        onChange={(event) => onChange({ ...value, limit: Number(event.target.value) || 100 })}
      />
      <button
        className="rounded bg-cyan-500 px-3 py-1 text-sm font-semibold text-slate-950 hover:bg-cyan-400"
        onClick={onSubmit}
        type="button"
      >
        Search
      </button>
    </div>
  );
}
