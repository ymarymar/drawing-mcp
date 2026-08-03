import type { CanvasCommand, DrawingOutput } from "../schema.js";

function renderCommandsToJS(commands: CanvasCommand[]): string {
  return commands
    .map((cmd) => {
      switch (cmd.type) {
        case "beginPath":
          return "ctx.beginPath();";
        case "closePath":
          return "ctx.closePath();";
        case "moveTo":
          return `ctx.moveTo(${cmd.x}, ${cmd.y});`;
        case "lineTo":
          return `ctx.lineTo(${cmd.x}, ${cmd.y});`;
        case "arc":
          return `ctx.arc(${cmd.x}, ${cmd.y ?? cmd.cy}, ${cmd.radius}, ${cmd.startAngle ?? 0}, ${cmd.endAngle ?? 6.283}${cmd.counterclockwise || cmd.anticlockwise ? ", true" : ""});`;
        case "ellipse":
          return `ctx.ellipse(${cmd.x}, ${cmd.y}, ${cmd.radiusX}, ${cmd.radiusY}, ${cmd.rotation ?? 0}, ${cmd.startAngle ?? 0}, ${cmd.endAngle ?? 6.283});`;
        case "bezierCurveTo":
          return `ctx.bezierCurveTo(${cmd.cp1x ?? cmd.x1 ?? 0}, ${cmd.cp1y ?? cmd.y1 ?? 0}, ${cmd.cp2x ?? cmd.x2 ?? 0}, ${cmd.cp2y ?? cmd.y2 ?? 0}, ${cmd.x ?? cmd.x3 ?? cmd.cx ?? 0}, ${cmd.y ?? cmd.y3 ?? cmd.cy ?? 0});`;
        case "quadraticCurveTo":
          return `ctx.quadraticCurveTo(${cmd.cpx ?? cmd.x1 ?? 0}, ${cmd.cpy ?? cmd.y1 ?? 0}, ${cmd.x ?? cmd.x2 ?? 0}, ${cmd.y ?? cmd.y2 ?? 0});`;
        case "setStrokeStyle":
          return [
            `ctx.strokeStyle = "${cmd.style ?? cmd.value ?? "#2a2520"}";`,
            cmd.width !== undefined ? `ctx.lineWidth = ${cmd.width};` : null,
            cmd.opacity !== undefined ? `ctx.globalAlpha = ${cmd.opacity};` : null,
          ]
            .filter(Boolean)
            .join("\n  ");
        case "strokeStyle":
          return `ctx.strokeStyle = "${cmd.style ?? cmd.value}";`;
        case "lineWidth":
          return `ctx.lineWidth = ${cmd.value};`;
        case "stroke":
          return "ctx.stroke();";
        case "setLineDash":
          return `ctx.setLineDash([${cmd.segments.join(", ")}]);`;
        case "setGlobalAlpha":
          return `ctx.globalAlpha = ${cmd.alpha ?? cmd.value};`;
        case "fill": {
          const fillColor = cmd.style ?? cmd.value;
          return fillColor ? `ctx.fillStyle = "${fillColor}";\nctx.fill();` : "ctx.fill();";
        }
        case "fillStyle":
          return `ctx.fillStyle = "${cmd.style ?? cmd.value}";`;
        case "save":
          return "ctx.save();";
        case "restore":
          return "ctx.restore();";
        case "rect":
          return `ctx.rect(${cmd.x}, ${cmd.y}, ${cmd.width}, ${cmd.height});`;
        case "setLineWidth":
          return `ctx.lineWidth = ${cmd.width};`;
        default:
          return "";
      }
    })
    .filter((line) => line.length > 0)
    .join("\n  ");
}

export function wrapAsHtmlCanvas(output: DrawingOutput): string {
  const commandsJS = renderCommandsToJS(output.commands);

  return `
<div style="font-family: system-ui, sans-serif; padding: 16px; background: #fafaf8; display: inline-block; border-radius: 4px;">
  <canvas
    id="drawing-${output.seq}"
    width="${output.canvas.width}"
    height="${output.canvas.height}"
    aria-label="${output.description}"
    style="display: block; border: 1px solid #e0ddd8; background: #fafaf8; border-radius: 2px;"
  ></canvas>
  <p style="margin: 8px 0 0; font-size: 12px; color: #888; text-transform: uppercase; letter-spacing: 0.05em;">
    ${output.layer} · ${output.description}
  </p>
</div>
<script>
(function() {
  const canvas = document.getElementById('drawing-${output.seq}');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  ctx.strokeStyle = '#2a2520';
  ctx.lineWidth = 1.0;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.globalAlpha = 1.0;

  ${commandsJS}
})();
</script>`.trim();
}

export function mergeLayersAsHtmlCanvas(layers: DrawingOutput[]): string {
  if (layers.length === 0) return "";

  const first = layers[0];
  const last = layers[layers.length - 1];

  if (!first || !last) return "";
  if (layers.length === 1) return wrapAsHtmlCanvas(first);

  const allCommands = layers.flatMap((l) => l.commands);
  const merged: DrawingOutput = {
    commands: allCommands,
    canvas: first.canvas,
    layer: last.layer,
    seq: last.seq,
    description: layers.map((l) => l.description).join(", "),
  };

  return wrapAsHtmlCanvas(merged);
}
