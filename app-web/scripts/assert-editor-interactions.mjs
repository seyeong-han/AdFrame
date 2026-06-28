import { readFile } from "node:fs/promises";

const editorSource = await readFile("app/editor/page.tsx", "utf8");

const requiredSnippets = [
  "draggable={asset.mediaType !== \"video\"}",
  "onDragStart={(event) => startAssetDrag(event, asset)}",
  "onDragOverCapture={handleCanvasDragOver}",
  "onDropCapture={handleCanvasDrop}",
  "event.dataTransfer.clearData()",
  "event.stopPropagation()",
  "<img draggable={false}",
  "screenToPage",
  "editor.select(shapeId)",
  "<option value=\"tile\">Tile</option>",
  "<option value=\"accent\">Accent</option>",
  "Bring front",
  "Send back",
  "Duplicate",
];

const missing = requiredSnippets.filter((snippet) => !editorSource.includes(snippet));

if (missing.length) {
  throw new Error(`Missing editor interaction hooks: ${missing.join(", ")}`);
}

console.log("editor interactions ok");
