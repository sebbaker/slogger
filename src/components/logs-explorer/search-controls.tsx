"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type SearchFilters = {
  search: string;
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
    <div className="bg-card grid gap-2 rounded-md border p-3 md:grid-cols-5">
      <Input
        placeholder="Full-text search"
        value={value.search}
        onChange={(event) => onChange({ ...value, search: event.target.value })}
      />
      <Input
        type="datetime-local"
        value={value.from}
        onChange={(event) => onChange({ ...value, from: event.target.value })}
      />
      <Input
        type="datetime-local"
        value={value.to}
        onChange={(event) => onChange({ ...value, to: event.target.value })}
      />
      <Input
        type="number"
        min={1}
        max={1000}
        value={value.limit}
        onChange={(event) => onChange({ ...value, limit: Number(event.target.value) || 100 })}
      />
      <Button
        onClick={onSubmit}
        type="button"
      >
        Search
      </Button>
    </div>
  );
}
