import { readFile } from "node:fs/promises";

const editorSource = await readFile("app/editor/page.tsx", "utf8");
const appChromeSource = await readFile("components/AppChrome.tsx", "utf8");
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
  "const [positionPreset, setPositionPreset]",
  "const [showPrice, setShowPrice]",
  "aria-label=\"Position preset\"",
  "POSITION_PRESETS.map",
  "updatePositionPreset(event.target.value as PositionPresetId)",
  "composeMainCanvasTemplate(nextProduct, nextPreset, nextPositionPreset, { showPrice: nextShowPrice })",
  "updateShowPrice(event.target.checked)",
  "Price",
  "Assets ({assets.length})",
  "Copy ({product.features.length})",
  "onClick={() => editor?.undo()}",
  "onClick={() => editor?.redo()}",
  "aria-label=\"Undo\"",
  "aria-label=\"Redo\"",
  "const ENABLE_CAROUSEL_FEATURES = false",
  "{ENABLE_CAROUSEL_FEATURES ? (",
  "onClick={generateCarouselSplit}",
  "composeCarouselSplitTemplate(product, EXPORT_PRESETS[0])",
  "downloadCarouselFramesZip(editor, carouselFrameIds)",
  "getCarouselFrameIds(editor)",
  "Created ${frameIds.length} editable carousel slides",
  "editor.select(shapeId)",
  "<option value=\"tile\">Tile</option>",
  "<option value=\"accent\">Accent</option>",
  "Bring front",
  "Send back",
  "Duplicate",
];

const missing = requiredSnippets.filter((snippet) => !editorSource.includes(snippet));
const appChromeMissing = [
  "\"use client\"",
  "usePathname",
  "aria-current={step.active ? \"page\" : undefined}",
  "className={step.active ? \"active\" : undefined}",
].filter((snippet) => !appChromeSource.includes(snippet));
const forbiddenChromeSnippets = ["Open studio", "ArrowUpRight"].filter((snippet) => appChromeSource.includes(snippet));
const shapeMissing = [
  "onDragStart={(event) => event.preventDefault()}",
  "draggable={false}",
].filter((snippet) => !shapeSource.includes(snippet));
const cssMissing = [
  "-webkit-user-drag: none",
  "user-select: none",
  "aspect-ratio: var(--stage-ratio",
  ".nav-pill a.active",
  ".nav-pill a[aria-current=\"page\"]",
  ".infograph-canvas-bg.light",
  ".glass-card-shape.paper",
  ".glass-card-shape.orange",
].filter((snippet) => !globalCss.includes(snippet));

if (missing.length || appChromeMissing.length || forbiddenChromeSnippets.length || shapeMissing.length || cssMissing.length) {
  throw new Error(
    [
      missing.length ? `Missing editor interaction hooks: ${missing.join(", ")}` : "",
      appChromeMissing.length ? `Missing nav active-state hooks: ${appChromeMissing.join(", ")}` : "",
      forbiddenChromeSnippets.length ? `Forbidden nav snippets remain: ${forbiddenChromeSnippets.join(", ")}` : "",
      shapeMissing.length ? `Missing canvas shape drag guards: ${shapeMissing.join(", ")}` : "",
      cssMissing.length ? `Missing canvas image drag CSS: ${cssMissing.join(", ")}` : "",
    ]
      .filter(Boolean)
      .join("\n"),
  );
}

console.log("editor interactions ok");
