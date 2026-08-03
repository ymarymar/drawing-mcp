// ── Security utilities ────────────────────────────────────────────────────────

const SYSTEM_PROMPT_SENTINELS = [
  "you are a drawing",
  "your instructions",
  "system prompt",
  "confidential",
  "ignore previous",
  "ignore all previous",
  "as an ai",
  "i am an ai",
  "i cannot",
  "i'm sorry, but",
  "process-based",
  "life drawing methodology",
];

export function containsLeakedPrompt(output: string): boolean {
  const lower = output.toLowerCase();
  return SYSTEM_PROMPT_SENTINELS.some((s) => lower.includes(s));
}

export function sanitiseInput(input: string): string {
  return input
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "")
    .replace(/\s{3,}/g, "  ")
    .replace(/ignore\s+(all\s+)?(previous|above|prior)\s+instructions?/gi, "")
    .replace(/system\s*prompt/gi, "")
    .replace(/you\s+are\s+(now\s+)?a/gi, "")
    .trim();
}

export function scrubError(err: unknown): string {
  if (err instanceof Error) {
    if (
      err.message.includes("api.anthropic.com") ||
      err.message.includes("x-api-key") ||
      err.message.includes("authorization") ||
      err.message.includes("Bearer")
    ) {
      return "Internal service error";
    }
    if (err.message.includes("ZodError") || err.constructor.name === "ZodError") {
      return "Invalid drawing output format";
    }
    return err.message;
  }
  return "Unknown error";
}

export function validateBase64Size(
  base64: string,
  maxBytes: number = 10 * 1024 * 1024
): void {
  const estimatedBytes = (base64.length * 3) / 4;
  if (estimatedBytes > maxBytes) {
    throw new Error(`Input exceeds maximum size of ${maxBytes / 1024 / 1024}MB`);
  }
}
