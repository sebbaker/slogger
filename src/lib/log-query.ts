import { db } from "@/lib/db";

export type QueryRow = {
  id: string;
  source: string;
  props: unknown;
  time: Date;
  created_at: Date;
};

export type QueryLogsInput = {
  sources?: string[];
  search?: string | null;
  jsonPath?: string | null;
  from?: string | null;
  to?: string | null;
  limit?: number;
  offset?: number;
};

function normalizeSources(sources?: string[]): string[] | undefined {
  if (!sources || sources.length === 0) {
    return undefined;
  }

  const cleaned = sources.map((value) => value.trim()).filter(Boolean);
  return cleaned.length > 0 ? cleaned : undefined;
}

export function parseDate(value: string | null | undefined): string | null {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toISOString();
}

export function parseLimit(value: number | string | null | undefined): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return 1000;
  }

  return Math.min(Math.floor(parsed), 1000);
}

export function parseOffset(value: number | string | null | undefined): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) {
    return 0;
  }

  return Math.floor(parsed);
}

export async function queryLogs(
  input: QueryLogsInput,
): Promise<{ logs: QueryRow[]; total: number }> {
  const sources = normalizeSources(input.sources);
  const search = input.search?.trim() || null;
  const from = parseDate(input.from);
  const to = parseDate(input.to);
  const limit = parseLimit(input.limit);
  const offset = parseOffset(input.offset);

  const params: unknown[] = [];
  const where: string[] = ["1=1"];

  if (sources && sources.length > 0) {
    params.push(sources);
    where.push(`source = ANY($${params.length}::text[])`);
  }

  if (search) {
    params.push(search);
    where.push(
      `to_tsvector('simple', props) @@ plainto_tsquery('simple', $${params.length})`,
    );
  }

  if (from) {
    params.push(from);
    where.push(`"time" >= $${params.length}::timestamp`);
  }

  if (to) {
    params.push(to);
    where.push(`"time" <= $${params.length}::timestamp`);
  }

  const whereClause = where.join(" AND ");

  const dataSql = `
    SELECT id, source, props, time, created_at
    FROM logs
    WHERE ${whereClause}
    ORDER BY time DESC
    LIMIT $${params.length + 1}
    OFFSET $${params.length + 2}
  `;

  const logs = await db.$queryRawUnsafe<QueryRow[]>(
    dataSql,
    ...params,
    limit,
    offset,
  );

  const countSql = `
    SELECT COUNT(*)::int AS total
    FROM logs
    WHERE ${whereClause}
  `;

  const [countResult] = await db.$queryRawUnsafe<Array<{ total: number }>>(
    countSql,
    ...params,
  );

  return {
    logs,
    total: countResult?.total ?? 0,
  };
}

export async function querySources(): Promise<string[]> {
  const rows: Array<{ source: string }> = await db.$queryRawUnsafe(
    "SELECT DISTINCT source FROM logs ORDER BY source ASC",
  );

  return rows.map((item) => item.source);
}
