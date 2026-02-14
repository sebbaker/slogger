import { addDays, format, startOfDay } from "date-fns";
import { db } from "@/lib/db";

function partitionName(date: Date): string {
  return `logs_${format(date, "yyyy_MM_dd")}`;
}

export async function ensurePartitionForDate(date: Date): Promise<void> {
  const from = startOfDay(date);
  const to = addDays(from, 1);
  const table = partitionName(from);

  const sql = `
    CREATE TABLE IF NOT EXISTS "${table}"
    PARTITION OF "logs"
    FOR VALUES FROM ('${from.toISOString()}') TO ('${to.toISOString()}');
  `;

  await db.$executeRawUnsafe(sql);
}

export async function ensurePartitions(daysAhead = 7): Promise<void> {
  const today = startOfDay(new Date());

  for (let i = 0; i <= daysAhead; i += 1) {
    await ensurePartitionForDate(addDays(today, i));
  }
}
