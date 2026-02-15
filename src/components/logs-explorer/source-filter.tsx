"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

type SourceFilterProps = {
  availableSources: string[];
  selectedSources: string[];
  onChange: (next: string[]) => void;
};

export function SourceFilter({ availableSources, selectedSources, onChange }: SourceFilterProps) {
  const allSelected =
    availableSources.length > 0 && selectedSources.length === availableSources.length;

  return (
    <div className="bg-card rounded-md border p-3">
      <p className="text-muted-foreground mb-2 text-xs font-medium uppercase tracking-wide">Sources</p>
      <div className="mb-2 flex items-center gap-2">
        <Checkbox
          id="source-filter-all"
          checked={allSelected}
          onCheckedChange={(checked) => onChange(checked ? availableSources : [])}
        />
        <Label htmlFor="source-filter-all">All</Label>
      </div>
      <div className="grid grid-cols-2 gap-1">
        {availableSources.map((source) => {
          const checked = selectedSources.includes(source);
          return (
            <div key={source} className="flex items-center gap-2">
              <Checkbox
                id={`source-filter-${source}`}
                checked={checked}
                onCheckedChange={(next) => {
                  if (next) {
                    onChange([...selectedSources, source]);
                    return;
                  }

                  onChange(selectedSources.filter((item) => item !== source));
                }}
              />
              <Label htmlFor={`source-filter-${source}`}>{source}</Label>
            </div>
          );
        })}
      </div>
    </div>
  );
}
