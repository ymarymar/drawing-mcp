import { sanitiseInput } from "../security/sanitise.js";
import { ANALYSE_SUBJECT_SYSTEM_PROMPT, REFINE_DRAWING_SYSTEM_PROMPT } from "../prompts/system.js";
import { callDrawingModel } from "./anthropic-client.js";
import { wrapAsHtmlCanvas } from "../rendering/canvas.js";
import type { CanvasCommand } from "../schema.js";

export async function handleAnalyseSubject(
  subject: string,
  complexity: "simple" | "detailed"
): Promise<{ content: Array<{ type: "text"; text: string }> }> {
  const safeSubject = sanitiseInput(subject);

  const userMessage = `Draw this subject: ${safeSubject}
Complexity: ${complexity}
Output only valid JSON matching the required schema.`;

  const drawingOutput = await callDrawingModel(
    ANALYSE_SUBJECT_SYSTEM_PROMPT,
    userMessage
  );

  const html = wrapAsHtmlCanvas(drawingOutput);

  return {
    content: [
      {
        type: "text",
        text: [
          `## Pencil Construction — ${drawingOutput.description}`,
          "",
          "Paste the HTML below into a Claude artifact or any HTML page to render the drawing:",
          "",
          "```html",
          html,
          "```",
          "",
          `Layer: **${drawingOutput.layer}** · Commands: ${drawingOutput.commands.length}`,
          "",
          "To refine this drawing, call `refine_drawing` with the commands below:",
          "",
          "```json",
          JSON.stringify(drawingOutput.commands, null, 2),
          "```",
        ].join("\n"),
      },
    ],
  };
}

export async function handleRefineDrawing(
  previousCommands: CanvasCommand[],
  detailLevel: 1 | 2 | 3
): Promise<{ content: Array<{ type: "text"; text: string }> }> {
  const userMessage = `Refine this drawing.
Detail level: ${detailLevel}
Existing construction commands:
${JSON.stringify(previousCommands, null, 2)}

Output only valid JSON for the ADDITIONAL refinement commands only.
Do not repeat the construction commands.`;

  const drawingOutput = await callDrawingModel(
    REFINE_DRAWING_SYSTEM_PROMPT,
    userMessage
  );

  const mergedOutput = {
    ...drawingOutput,
    commands: [...previousCommands, ...drawingOutput.commands],
    layer: drawingOutput.layer,
  };

  const html = wrapAsHtmlCanvas(mergedOutput);

  return {
    content: [
      {
        type: "text",
        text: [
          `## Refined Drawing — Detail level ${detailLevel}`,
          "",
          "```html",
          html,
          "```",
          "",
          `Layer: **${drawingOutput.layer}** · New commands: ${drawingOutput.commands.length} · Total: ${mergedOutput.commands.length}`,
        ].join("\n"),
      },
    ],
  };
}
