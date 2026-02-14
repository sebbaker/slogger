function getValueAtPath(input: Record<string, unknown>, path: string): unknown {
  const parts = path.split(".");
  let current: unknown = input;

  for (const part of parts) {
    if (typeof current !== "object" || current === null) {
      return undefined;
    }

    current = (current as Record<string, unknown>)[part];
  }

  return current;
}

function toValidDate(value: unknown): Date | null {
  if (typeof value === "string" || typeof value === "number") {
    const date = new Date(value);
    if (!Number.isNaN(date.getTime())) {
      return date;
    }
  }

  return null;
}

export function extractTime(entry: Record<string, unknown>, timePaths: string[]): Date | null {
  for (const path of timePaths) {
    const value = getValueAtPath(entry, path);
    const maybeDate = toValidDate(value);
    if (maybeDate) {
      return maybeDate;
    }
  }

  return null;
}
