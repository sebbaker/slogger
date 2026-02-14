import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { z } from "zod";
import { verifyApiKey } from "@/lib/auth";
import { parseLimit, parseOffset, queryLogs, querySources } from "@/lib/log-query";

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
      description: "Search logs by source, full-text, JSONPath, time range, and pagination.",
      inputSchema: {
        sources: z.array(z.string()).optional(),
        search: z.string().optional(),
        jsonPath: z.string().optional(),
        from: z.string().optional(),
        to: z.string().optional(),
        limit: z.number().int().positive().max(1000).optional(),
        offset: z.number().int().nonnegative().optional(),
      },
    },
    async (args) => {
      const { logs, total } = await queryLogs({
        sources: args.sources,
        search: args.search,
        jsonPath: args.jsonPath,
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
    sessionIdGenerator: undefined,
  });

  const server = createServer();
  await server.connect(transport);

  try {
    return await transport.handleRequest(request);
  } finally {
    await server.close();
    await transport.close();
  }
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
