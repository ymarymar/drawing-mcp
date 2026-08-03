import { z } from "zod";

// ── Canvas command types ──────────────────────────────────────────────────────
// This is the only output channel that ever leaves the server.
// If it doesn't match this schema, it gets dropped. Full stop.

export const CanvasCommandSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("beginPath") }),
  z.object({ type: z.literal("closePath") }),
  z.object({
    type: z.literal("moveTo"),
    x: z.number(),
    y: z.number(),
  }),
  z.object({
    type: z.literal("lineTo"),
    x: z.number(),
    y: z.number(),
  }),
  z.object({
    type: z.literal("arc"),
    x: z.number(),
    y: z.number().optional(),
    cy: z.number().optional(),
    radius: z.number().positive(),
    startAngle: z.number().optional(),
    endAngle: z.number().optional(),
    counterclockwise: z.boolean().optional(),
    anticlockwise: z.boolean().optional(),
  }),
  z.object({
    type: z.literal("ellipse"),
    x: z.number(),
    y: z.number(),
    radiusX: z.number().positive(),
    radiusY: z.number().positive(),
    rotation: z.number().optional(),
    startAngle: z.number().optional(),
    endAngle: z.number().optional(),
    counterclockwise: z.boolean().optional(),
  }),
  z.object({
    type: z.literal("fill"),
    style: z.string().regex(/^#[0-9a-fA-F]{3,6}$/).optional(),
    value: z.string().regex(/^#[0-9a-fA-F]{3,6}$/).optional(),
  }),
  z.object({
    type: z.literal("fillStyle"),
    style: z.string().regex(/^#[0-9a-fA-F]{3,6}$/).optional(),
    value: z.string().regex(/^#[0-9a-fA-F]{3,6}$/).optional(),
  }),
  z.object({ type: z.literal("save") }),
  z.object({ type: z.literal("restore") }),
  z.object({
    type: z.literal("rect"),
    x: z.number(),
    y: z.number(),
    width: z.number(),
    height: z.number(),
  }),
  z.object({
    type: z.literal("setLineWidth"),
    width: z.number().positive().max(20),
  }),
  z.object({
    type: z.literal("bezierCurveTo"),
    // Standard names
    cp1x: z.number().optional(),
    cp1y: z.number().optional(),
    cp2x: z.number().optional(),
    cp2y: z.number().optional(),
    x: z.number().optional(),
    y: z.number().optional(),
    // Alternate names the model sometimes uses
    x1: z.number().optional(),
    y1: z.number().optional(),
    x2: z.number().optional(),
    y2: z.number().optional(),
    x3: z.number().optional(),
    y3: z.number().optional(),
    cx: z.number().optional(),
    cy: z.number().optional(),
  }),
  z.object({
    type: z.literal("quadraticCurveTo"),
    cpx: z.number().optional(),
    cpy: z.number().optional(),
    x1: z.number().optional(),  // alternate control point name
    y1: z.number().optional(),  // alternate control point name
    x: z.number().optional(),
    y: z.number().optional(),
    x2: z.number().optional(),  // alternate end point name
    y2: z.number().optional(),  // alternate end point name
  }),
  z.object({
    type: z.literal("setStrokeStyle"),
    style: z.string().regex(/^#[0-9a-fA-F]{3,6}$/).optional(),
    value: z.string().regex(/^#[0-9a-fA-F]{3,6}$/).optional(),
    width: z.number().positive().max(20).optional(),
    opacity: z.number().min(0).max(1).optional(),
  }),
  // Alias the model uses as a standalone command
  z.object({
    type: z.literal("strokeStyle"),
    style: z.string().regex(/^#[0-9a-fA-F]{3,6}$/).optional(),
    value: z.string().regex(/^#[0-9a-fA-F]{3,6}$/).optional(),
  }),
  // Alias the model uses as a standalone command
  z.object({
    type: z.literal("lineWidth"),
    value: z.number().positive().max(20),
  }),
  z.object({
    type: z.literal("stroke"),
  }),
  z.object({
    type: z.literal("setLineDash"),
    segments: z.array(z.number().nonnegative()).max(6),
  }),
  z.object({
    type: z.literal("setGlobalAlpha"),
    alpha: z.number().min(0).max(1).optional(),
    value: z.number().min(0).max(1).optional(),
  }),
]);

export type CanvasCommand = z.infer<typeof CanvasCommandSchema>;

export const LayerSchema = z.enum(["gesture", "construction", "refinement", "drawing"]);
export type Layer = z.infer<typeof LayerSchema>;

export const DrawingOutputSchema = z.object({
  commands: z.array(CanvasCommandSchema).min(1).max(500),
  canvas: z.object({
    width: z.number().int().min(200).max(1200),
    height: z.number().int().min(200).max(1200),
  }),
  layer: LayerSchema,
  seq: z.number().int().nonnegative(),
  description: z.string().max(200),
});

export type DrawingOutput = z.infer<typeof DrawingOutputSchema>;

export const AnalyseSubjectInputSchema = z.object({
  subject: z
    .string()
    .min(2)
    .max(300)
    .describe("What to draw — be specific about pose, angle, mood"),
  complexity: z
    .enum(["simple", "detailed"])
    .default("simple")
    .describe("simple = gesture + primary forms, detailed = full construction"),
});

export const RefineDrawingInputSchema = z.object({
  previous_commands: z
    .array(CanvasCommandSchema)
    .min(1)
    .max(500)
    .describe("Canvas commands from a previous analyse_subject call"),
  detail_level: z
    .number()
    .int()
    .min(1)
    .max(3)
    .describe("1 = clean line, 2 = contour + weight, 3 = form shadow"),
});
