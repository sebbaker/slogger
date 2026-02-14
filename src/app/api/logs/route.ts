import { NextResponse } from "next/server";
import { verifyRequest } from "@/lib/auth";
import { parseLimit, parseOffset, queryLogs } from "@/lib/log-query";

export async function GET(request: Request) {
  if (!verifyRequest(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);

  const sources = searchParams
    .get("sources")
    ?.split(",")
    .map((value) => value.trim())
    .filter(Boolean);

  const { logs, total } = await queryLogs({
    sources,
    search: searchParams.get("search")?.trim(),
    jsonPath: searchParams.get("json_path")?.trim(),
    from: searchParams.get("from"),
    to: searchParams.get("to"),
    limit: parseLimit(searchParams.get("limit")),
    offset: parseOffset(searchParams.get("offset")),
  });

  return NextResponse.json({
    logs,
    total,
  });
}
