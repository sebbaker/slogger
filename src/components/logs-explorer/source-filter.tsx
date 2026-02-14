"use client";

type SourceFilterProps = {
  availableSources: string[];
  selectedSources: string[];
  onChange: (next: string[]) => void;
};

export function SourceFilter({ availableSources, selectedSources, onChange }: SourceFilterProps) {
  const allSelected =
    availableSources.length > 0 && selectedSources.length === availableSources.length;

  return (
    <div className="rounded-md border border-slate-800 bg-slate-900 p-3">
      <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-400">Sources</p>
      <label className="mb-2 flex items-center gap-2 text-sm text-slate-200">
        <input
          type="checkbox"
          checked={allSelected}
          onChange={(event) => onChange(event.target.checked ? availableSources : [])}
        />
        All
      </label>
      <div className="grid grid-cols-2 gap-1">
        {availableSources.map((source) => {
          const checked = selectedSources.includes(source);
          return (
            <label key={source} className="flex items-center gap-2 text-sm text-slate-200">
              <input
                type="checkbox"
                checked={checked}
                onChange={(event) => {
                  if (event.target.checked) {
                    onChange([...selectedSources, source]);
                    return;
                  }

                  onChange(selectedSources.filter((item) => item !== source));
                }}
              />
              {source}
            </label>
          );
        })}
      </div>
    </div>
  );
}
