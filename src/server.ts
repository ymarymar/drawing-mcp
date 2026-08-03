import "dotenv/config";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { createServer, IncomingMessage, ServerResponse } from "http";
import { z } from "zod";
import { handleAnalyseSubject, handleRefineDrawing } from "./tools/handlers.js";
import { CanvasCommandSchema } from "./schema.js";

function isAuthorised(req: IncomingMessage): boolean {
  const auth = req.headers["authorization"];
  if (!auth || !auth.startsWith("Bearer ")) return false;
  const token = auth.slice(7);
  const validKey = process.env.API_KEY;
  if (!validKey) return false;
  return timingSafeEqual(token, validKey);
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

function createMcpServer(): McpServer {
  const server = new McpServer({ name: "drawing-mcp", version: "1.0.0" });

  server.tool(
    "analyse_subject",
    `Applies a process-based pencil construction methodology to analyse a drawing
subject and produce a layered Canvas drawing. Works from gesture to primary
volumes to secondary forms — the classical approach to constructive drawing.
Always call this first. Returns an HTML canvas snippet ready to render, plus
the raw commands needed to call refine_drawing.`,
    {
      subject: z.string().min(2).max(300).describe(
        "What to draw. Be specific: pose, angle, mood."
      ),
      complexity: z.enum(["simple", "detailed"]).default("simple").describe(
        "simple = gesture and primary volumes only. detailed = full construction."
      ),
    },
    async ({ subject, complexity }) => handleAnalyseSubject(subject, complexity)
  );

  server.tool(
    "refine_drawing",
    `Builds a refinement layer on top of an existing pencil construction drawing.
Call this after analyse_subject. Returns merged HTML canvas snippet.`,
    {
      previous_commands: z.array(CanvasCommandSchema).min(1).max(500).describe(
        "The commands array from a previous analyse_subject response."
      ),
      detail_level: z.number().int().min(1).max(3).describe(
        "1 = clean line. 2 = line weight variation. 3 = directional hatching."
      ),
    },
    async ({ previous_commands, detail_level }) =>
      handleRefineDrawing(previous_commands, detail_level as 1 | 2 | 3)
  );

  return server;
}

const PORT = parseInt(process.env.PORT ?? "3000", 10);
const activeTransports = new Map<string, SSEServerTransport>();

const httpServer = createServer(async (req: IncomingMessage, res: ServerResponse) => {
  const url = new URL(req.url ?? "/", `http://localhost:${PORT}`);

  if (url.pathname === "/health" && req.method === "GET") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ status: "ok", version: "1.0.0" }));
    return;
  }

  if (!isAuthorised(req)) {
    res.writeHead(401, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Unauthorised" }));
    return;
  }

  if (url.pathname === "/mcp" && req.method === "GET") {
    const sessionId = crypto.randomUUID();
    const transport = new SSEServerTransport(`/mcp/message/${sessionId}`, res);
    activeTransports.set(sessionId, transport);
    res.on("close", () => {
      activeTransports.delete(sessionId);
      console.error(`[mcp] Session closed: ${sessionId}`);
    });
    const server = createMcpServer();
    await server.connect(transport);
    console.error(`[mcp] Session started: ${sessionId}`);
    return;
  }

  if (url.pathname.startsWith("/mcp/message/") && req.method === "POST") {
    const sessionId = url.pathname.split("/").pop();
    const transport = sessionId ? activeTransports.get(sessionId) : undefined;
    if (!transport) {
      res.writeHead(404, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Session not found" }));
      return;
    }
    await transport.handlePostMessage(req, res);
    return;
  }

  res.writeHead(404, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ error: "Not found" }));
});

httpServer.listen(PORT, "127.0.0.1", () => {
  console.error(`[drawing-mcp] HTTP server listening on 127.0.0.1:${PORT}`);
});

process.on("SIGTERM", () => {
  httpServer.close(() => process.exit(0));
});
process.on("SIGINT", () => {
  httpServer.close(() => process.exit(0));
});
