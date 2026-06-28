import { readFile } from "node:fs/promises";

const editorSource = await readFile("app/editor/page.tsx", "utf8");
const shapeSource = await readFile("lib/tldraw/shapes/fridgeframe-shapes.tsx", "utf8");
const globalCss = await readFile("app/globals.css", "utf8");

const requiredSnippets = [
  "draggable={asset.mediaType !== \"video\"}",
  "onDragStart={(event) => startAssetDrag(event, asset)}",
  "onDragOverCapture={handleCanvasDragOver}",
  "onDropCapture={handleCanvasDrop}",
  "event.dataTransfer.clearData()",
  "event.stopPropagation()",
  "<img draggable={false}",
  "screenToPage",
  "\"--stage-ratio\": preset.ratio",
  "editor.select(shapeId)",
  "<option value=\"tile\">Tile</option>",
  "<option value=\"accent\">Accent</option>",
  "Bring front",
  "Send back",
  "Duplicate",
];

const missing = requiredSnippets.filter((snippet) => !editorSource.includes(snippet));
const shapeMissing = [
  "onDragStart={(event) => event.preventDefault()}",
  "draggable={false}",
].filter((snippet) => !shapeSource.includes(snippet));
const cssMissing = [
  "-webkit-user-drag: none",
  "user-select: none",
  "aspect-ratio: var(--stage-ratio",
].filter((snippet) => !globalCss.includes(snippet));

if (missing.length || shapeMissing.length || cssMissing.length) {
  throw new Error(
    [
      missing.length ? `Missing editor interaction hooks: ${missing.join(", ")}` : "",
      shapeMissing.length ? `Missing canvas shape drag guards: ${shapeMissing.join(", ")}` : "",
      cssMissing.length ? `Missing canvas image drag CSS: ${cssMissing.join(", ")}` : "",
    ]
      .filter(Boolean)
      .join("\n"),
  );
}

console.log("editor interactions ok");
