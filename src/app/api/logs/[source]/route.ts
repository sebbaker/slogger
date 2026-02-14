import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { z } from "zod";
import { verifyRequest } from "@/lib/auth";
import { readConfig } from "@/lib/config";
import { db } from "@/lib/db";
import { ensurePartitionForDate } from "@/lib/partition-manager";
import { extractTime } from "@/lib/time-extraction";

const payloadSchema = z.array(z.unknown());

function normalizeProps(value: unknown): Prisma.InputJsonValue {
  if (typeof value === "object" && value !== null && !Array.isArray(value)) {
    return value as Prisma.InputJsonValue;
  }

  return { value } as Prisma.InputJsonValue;
}

export async function POST(
  request: Request,
  context: { params: Promise<{ source: string }> },
) {
  if (!verifyRequest(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { source } = await context.params;
  const parsedBody = payloadSchema.safeParse(await request.json().catch(() => null));

  if (!parsedBody.success) {
    return NextResponse.json({ error: "body must be a json array" }, { status: 400 });
  }

  const config = readConfig();
  const rows = parsedBody.data.map((entry) => {
    const props = normalizeProps(entry);
    const extracted = extractTime(props as Record<string, unknown>, config.time_paths);

    return {
      source,
      props,
      time: extracted ?? new Date(),
    };
  });

  const uniqueDays = new Set(rows.map((row) => row.time.toISOString().slice(0, 10)));
  for (const day of uniqueDays) {
    await ensurePartitionForDate(new Date(`${day}T00:00:00.000Z`));
  }

  const result = await db.log.createMany({ data: rows });
  return NextResponse.json({ inserted: result.count });
}
