import "dotenv/config";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { handleAnalyseSubject, handleRefineDrawing } from "./tools/handlers.js";
import { CanvasCommandSchema } from "./schema.js";

const server = new McpServer({
  name: "drawing-mcp",
  version: "1.0.0",
});

server.tool(
  "analyse_subject",
  `Applies a process-based pencil construction methodology to analyse a drawing
subject and produce a layered Canvas drawing. Works from gesture to primary
volumes to secondary forms — the classical approach to constructive drawing.
Always call this first. Returns an HTML canvas snippet ready to render, plus
the raw commands needed to call refine_drawing.`,
  {
    subject: z
      .string()
      .min(2)
      .max(300)
      .describe(
        "What to draw. Be specific: pose, angle, mood. E.g. 'a bird perched on a branch, side view, relaxed'"
      ),
    complexity: z
      .enum(["simple", "detailed"])
      .default("simple")
      .describe(
        "simple = gesture and primary volumes only. detailed = full construction with secondary forms and contour."
      ),
  },
  async ({ subject, complexity }) => {
    return handleAnalyseSubject(subject, complexity);
  }
);

server.tool(
  "refine_drawing",
  `Builds a refinement layer on top of an existing pencil construction drawing.
Call this after analyse_subject to add line quality, weight variation, or
form shadow. Returns a new HTML canvas snippet with both layers merged.`,
  {
    previous_commands: z
      .array(CanvasCommandSchema)
      .min(1)
      .max(500)
      .describe("The commands array from a previous analyse_subject response."),
    detail_level: z
      .number()
      .int()
      .min(1)
      .max(3)
      .describe("1 = clean line. 2 = line weight variation. 3 = directional hatching."),
  },
  async ({ previous_commands, detail_level }) => {
    return handleRefineDrawing(previous_commands, detail_level as 1 | 2 | 3);
  }
);

const transport = new StdioServerTransport();

async function main() {
  await server.connect(transport);
  console.error("[drawing-mcp] Server started on stdio");
}

main().catch((err) => {
  console.error("[drawing-mcp] Fatal error:", err);
  process.exit(1);
});
