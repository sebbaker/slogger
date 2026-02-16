import { verifyApiKey } from "@/lib/auth";
import {
  parseLimit,
  parseOffset,
  queryLogs,
  querySources,
} from "@/lib/log-query";
import { maxLimit } from "@/shared/max-logs-query";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { z } from "zod";

function createServer() {
  const server = new McpServer({
    name: "slogger-mcp",
    version: "1.0.0",
  });

  server.registerTool(
    "get_sources",
    {
      title: "Get Sources",
      description: "Returns available log sources.",
    },
    async () => {
      const sources = await querySources();
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({ sources }, null, 2),
          },
        ],
      };
    },
  );

  server.registerTool(
    "search_logs",
    {
      title: "Search Logs",
      description:
        "Search logs by source, full-text, JSONPath, time range, and pagination.",
      inputSchema: {
        sources: z.array(z.string()).optional(),
        search: z.string().optional().describe("Simple plain text match"),
        from: z.string().optional().describe("from iso time"),
        to: z.string().optional().describe("to iso time"),
        limit: z.number().int().positive().max(maxLimit).optional(),
        offset: z.number().int().nonnegative().optional(),
      },
    },
    async (args) => {
      const { logs, total } = await queryLogs({
        sources: args.sources,
        search: args.search,
        from: args.from,
        to: args.to,
        limit: parseLimit(args.limit),
        offset: parseOffset(args.offset),
      });

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({ logs, total }, null, 2),
          },
        ],
      };
    },
  );

  return server;
}

async function handleMcpRequest(request: Request) {
  const { searchParams } = new URL(request.url);
  const apiKey = searchParams.get("apiKey")?.trim();

  if (!apiKey || !verifyApiKey(apiKey)) {
    return new Response(JSON.stringify({ error: "unauthorized" }), {
      status: 401,
      headers: { "content-type": "application/json" },
    });
  }

  const transport = new WebStandardStreamableHTTPServerTransport({
    enableJsonResponse: true,
    sessionIdGenerator: undefined,
  });

  const server = createServer();
  transport.onclose = async () => {
    await server.close();
    await transport.close();
  };
  await server.connect(transport);

  const normalizedRequest = await normalizeAcceptHeaders(request);
  return transport.handleRequest(normalizedRequest);
}

async function normalizeAcceptHeaders(request: Request): Promise<Request> {
  if (request.method !== "GET" && request.method !== "POST") {
    return request;
  }

  const headers = new Headers(request.headers);
  const accept = headers.get("accept") ?? "";

  if (request.method === "GET") {
    if (!accept.includes("text/event-stream")) {
      headers.set(
        "accept",
        accept ? `${accept}, text/event-stream` : "text/event-stream",
      );
      return new Request(request.url, { method: "GET", headers });
    }
    return request;
  }

  const needsJson = !accept.includes("application/json");
  const needsSse = !accept.includes("text/event-stream");
  if (!needsJson && !needsSse) {
    return request;
  }

  const nextAccept = [
    accept,
    needsJson ? "application/json" : "",
    needsSse ? "text/event-stream" : "",
  ]
    .filter(Boolean)
    .join(", ");

  headers.set("accept", nextAccept);
  const body = await request.text();
  return new Request(request.url, {
    body,
    headers,
    method: "POST",
  });
}

export async function GET(request: Request) {
  return handleMcpRequest(request);
}

export async function POST(request: Request) {
  return handleMcpRequest(request);
}

export async function DELETE(request: Request) {
  return handleMcpRequest(request);
}
