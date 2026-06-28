import { readFile } from "node:fs/promises";

const editorSource = await readFile("app/editor/page.tsx", "utf8");
const appChromeSource = await readFile("components/AppChrome.tsx", "utf8");
const shapeSource = await readFile("lib/tldraw/shapes/adframe-shapes.tsx", "utf8");
const globalCss = await readFile("app/globals.css", "utf8");
const layoutReviewSource = await readFile("lib/agents/layout-review.ts", "utf8");
const layoutReviewRouteSource = await readFile("app/api/layout-review/route.ts", "utf8");

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
  "type LayoutReviewPatch",
  "type LayoutReviewResult",
  "const [layoutReview, setLayoutReview]",
  "useApprovedExtractionSnapshot",
  "const product = useApprovedExtractionSnapshot()",
  "const composedExtractionKey = useRef(\"\")",
  "extractionCanvasKey(product)",
  "async function reviewLayout()",
  "editor.toImage([frame.id]",
  "fetch(\"/api/layout-review\"",
  "positionPreset",
  "serializeReviewShapes(editor, frame.id)",
  "applyLayoutReviewPatches(editor, frame.id, result.patches, assets)",
  "Review layout",
  "Layout reviewed:",
  "getAssetTilePresentation(asset, \"manual\")",
  "tileStyle: placement.tileStyle",
  "function switchSelectedAsset()",
  "selected.type !== CUTOUT_IMAGE_TYPE",
  "const imageAssets = assets.filter((asset) => asset.mediaType !== \"video\")",
  "Switched selected asset to ${nextAsset.name}.",
  "Change asset",
  "<Repeat2 size={15} />",
];

const missing = requiredSnippets.filter((snippet) => !editorSource.includes(snippet));
const appChromeMissing = [
  "\"use client\"",
  "usePathname",
  "aria-current={step.active ? \"page\" : undefined}",
  "className={step.active ? \"active\" : undefined}",
].filter((snippet) => !appChromeSource.includes(snippet));
const forbiddenChromeSnippets = ["Open studio", "ArrowUpRight"].filter((snippet) => appChromeSource.includes(snippet));
const forbiddenEditorFallbacks = [
  "/fixtures/samsung-s90f/oled-tv.svg",
  "Product cutout",
  "front TV product cutout",
  "product-front",
].filter((snippet) => shapeSource.includes(snippet) || editorSource.includes(snippet));
const shapeMissing = [
  "function fitImageToBox",
  "function fitImageFullWidth",
  "function FitCutoutImage",
  "bgRemoved={shape.props.bgRemoved}",
  "showBody?: boolean",
  "shape.props.showBody ?",
  "override isAspectRatioLocked() {\n    return false;",
  "override onResize(shape: CutoutImageShape, info: TLResizeInfo<CutoutImageShape>)",
  "const resized = resizeBox(shape, info)",
  "initialCenter.x - resizedCenter.x",
  "initialCenter.y - resizedCenter.y",
  "onDragStart={(event) => event.preventDefault()}",
  "draggable={false}",
  "style={{ pointerEvents: \"all\", overflow: \"hidden\", ...boxStyle }}",
  "className={`cutout-shape ${tileStyle}`}",
  "padding={padding}",
].filter((snippet) => !shapeSource.includes(snippet));
const cssMissing = [
  "-webkit-user-drag: none",
  "user-select: none",
  "width: auto",
  "max-width: 100%",
  "max-height: 100%",
  "aspect-ratio: var(--stage-ratio",
  "justify-items: center",
  "text-align: center",
  ".nav-pill a.active",
  ".nav-pill a[aria-current=\"page\"]",
  ".infograph-canvas-bg.light",
  ".glass-card-shape.paper",
  ".glass-card-shape.orange",
  ".cutout-shape.paper",
  ".cutout-shape.glass",
  ".cutout-shape.bleed",
].filter((snippet) => !globalCss.includes(snippet));
const layoutReviewMissing = [
  "import { Agent, run, tool } from \"@openai/agents\"",
  "LayoutReviewRequestSchema",
  "LayoutReviewResultSchema",
  "reviewLayoutWithAgents",
  "function deterministicReview",
  "measure_layout",
  "rank_assets_for_slot",
  "propose_grid_reflow",
  "OPENAI_API_KEY",
  "sanitizePatches",
].filter((snippet) => !layoutReviewSource.includes(snippet));
const layoutReviewRouteMissing = [
  "export const runtime = \"nodejs\"",
  "LayoutReviewRequestSchema.safeParse",
  "reviewLayoutWithAgents(parsed.data)",
].filter((snippet) => !layoutReviewRouteSource.includes(snippet));

if (
  missing.length ||
  appChromeMissing.length ||
  forbiddenChromeSnippets.length ||
  forbiddenEditorFallbacks.length ||
  shapeMissing.length ||
  cssMissing.length ||
  layoutReviewMissing.length ||
  layoutReviewRouteMissing.length
) {
  throw new Error(
    [
      missing.length ? `Missing editor interaction hooks: ${missing.join(", ")}` : "",
      appChromeMissing.length ? `Missing nav active-state hooks: ${appChromeMissing.join(", ")}` : "",
      forbiddenChromeSnippets.length ? `Forbidden nav snippets remain: ${forbiddenChromeSnippets.join(", ")}` : "",
      forbiddenEditorFallbacks.length ? `Forbidden editor image fallbacks remain: ${forbiddenEditorFallbacks.join(", ")}` : "",
      shapeMissing.length ? `Missing canvas shape drag guards: ${shapeMissing.join(", ")}` : "",
      cssMissing.length ? `Missing canvas image drag CSS: ${cssMissing.join(", ")}` : "",
      layoutReviewMissing.length ? `Missing layout review workflow hooks: ${layoutReviewMissing.join(", ")}` : "",
      layoutReviewRouteMissing.length ? `Missing layout review route hooks: ${layoutReviewRouteMissing.join(", ")}` : "",
    ]
      .filter(Boolean)
      .join("\n"),
  );
}

console.log("editor interactions ok");
