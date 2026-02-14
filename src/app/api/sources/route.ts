import { NextResponse } from "next/server";
import { verifyRequest } from "@/lib/auth";
import { querySources } from "@/lib/log-query";

export async function GET(request: Request) {
  if (!verifyRequest(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const sources = await querySources();
  return NextResponse.json({ sources });
}
