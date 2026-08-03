import Anthropic from "@anthropic-ai/sdk";
import { DrawingOutputSchema, CanvasCommandSchema, type DrawingOutput } from "../schema.js";
import { containsLeakedPrompt, scrubError } from "../security/sanitise.js";

const KNOWN_COMMAND_TYPES: Set<string> = new Set(
  CanvasCommandSchema.options.map((s) => s.shape.type.value)
);

let _client: Anthropic | null = null;

function getClient(): Anthropic {
  if (!_client) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error("ANTHROPIC_API_KEY environment variable is not set");
    }
    _client = new Anthropic({ apiKey });
  }
  return _client;
}

export async function callDrawingModel(
  systemPrompt: string,
  userMessage: string
): Promise<DrawingOutput> {
  const client = getClient();

  let rawText: string;

  try {
    const response = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 2000,
      system: systemPrompt,
      messages: [{ role: "user", content: userMessage }],
    });

    rawText = response.content
      .filter((block): block is Anthropic.TextBlock => block.type === "text")
      .map((block) => block.text)
      .join("");
  } catch (err) {
    throw new Error(scrubError(err));
  }

  if (containsLeakedPrompt(rawText)) {
    console.warn("[security] Possible prompt extraction attempt detected");
    throw new Error("Invalid drawing output");
  }

  const cleaned = rawText.trim()
    .replace(/^```json/i, "")
    .replace(/^```/, "")
    .replace(/```$/, "")
    .trim();

  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    console.warn("[drawing] Model returned non-JSON output");
    throw new Error("Invalid drawing output format");
  }

  if (
    typeof parsed === "object" &&
    parsed !== null &&
    "error" in parsed
  ) {
    console.warn("[security] Model returned error object:", (parsed as { error: string }).error);
    throw new Error("Invalid drawing request");
  }

  // Normalize "cmd" to "type" — the model sometimes uses cmd as the discriminator key.
  if (typeof parsed === "object" && parsed !== null && "commands" in parsed && Array.isArray((parsed as { commands: unknown[] }).commands)) {
    const output = parsed as { commands: unknown[] };
    output.commands = output.commands.map((cmd) => {
      if (typeof cmd === "object" && cmd !== null && "cmd" in cmd && !("type" in cmd)) {
        const { cmd: cmdValue, ...rest } = cmd as { cmd: unknown; [key: string]: unknown };
        return { type: cmdValue, ...rest };
      }
      return cmd;
    });
  }

  // Strip any command whose type is not in the schema rather than failing the whole response.
  if (typeof parsed === "object" && parsed !== null && "commands" in parsed && Array.isArray((parsed as { commands: unknown[] }).commands)) {
    const output = parsed as { commands: unknown[] };
    const before = output.commands.length;
    output.commands = output.commands.filter(
      (cmd) => typeof cmd === "object" && cmd !== null && "type" in cmd && KNOWN_COMMAND_TYPES.has((cmd as { type: string }).type)
    );
    const dropped = before - output.commands.length;
    if (dropped > 0) console.warn(`[drawing] Dropped ${dropped} unknown command(s)`);
  }

  // Truncate description if it exceeds the 200-char schema limit.
  if (typeof parsed === "object" && parsed !== null && "description" in parsed) {
    const p = parsed as { description: unknown };
    if (typeof p.description === "string" && p.description.length > 200) {
      p.description = p.description.substring(0, 197) + "...";
    }
  }

  const result = DrawingOutputSchema.safeParse(parsed);
  if (!result.success) {
    console.warn("[drawing] Schema validation failed:", result.error.issues);
    
    //temp debug outputs TO BE REMOVED.
    console.warn("[drawing] Raw parsed output:", JSON.stringify(parsed, null, 2));
    throw new Error("Invalid drawing output format");
  }

  return result.data;
}
