"use client";

import { useCallback, useEffect, useRef, useState, type CSSProperties, type DragEvent } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowDownToLine,
  CheckCircle2,
  Copy,
  FileArchive,
  FileImage,
  FileText,
  ImagePlus,
  Layers,
  Maximize2,
  Repeat2,
  RotateCcw,
  RotateCw,
  Sparkles,
  WandSparkles,
} from "lucide-react";
import {
  createShapeId,
  type Editor,
  type TLShape,
  type TLShapeId,
  type TLShapePartial,
  Tldraw,
} from "tldraw";
import { AppShell } from "@/components/AppChrome";
import { ProvenanceChip } from "@/components/ProvenanceChip";
import { downloadCarouselFramesZip, downloadCarouselSlidesZip, downloadFrame, downloadPdfProof } from "@/lib/export";
import { isExtractionApproved, useApprovedExtractionSnapshot } from "@/lib/client-store";
import { removeBackgroundLocally } from "@/lib/segmentation";
import { EXPORT_PRESETS, type ExportPreset, type ProductAsset, type ProductExtraction } from "@/lib/types";
import { POSITION_PRESETS, STYLE_PRESETS, type PositionPresetId, type StylePreset } from "@/lib/presets";
import {
  CAROUSEL_FRAME_PREFIX,
  composeCarouselSplitTemplate,
  composeMainCanvasTemplate,
  getAssetTilePresentation,
  type AssetTilePresentation,
} from "@/lib/tldraw/templates";
import {
  CUTOUT_IMAGE_TYPE,
  GLASS_CARD_TYPE,
  GLASS_TEXT_TYPE,
  adFrameShapeUtils,
  type CutoutImageShape,
  type GlassCardShape,
  type GlassTextShape,
} from "@/lib/tldraw/shapes/adframe-shapes";

type InspectorState = {
  id: TLShapeId;
  type: TLShape["type"];
  title?: string;
  body?: string;
  text?: string;
  w?: number;
  h?: number;
  tone?: string;
  src?: string;
  bgRemoved?: boolean;
};

type LayoutReviewPatch =
  | { type: "moveResize"; shapeId: string; x: number; y: number; w?: number; h?: number }
  | { type: "swapAsset"; shapeId: string; assetId: string; src: string; alt: string; fit: "contain" | "cover" }
  | { type: "updateProps"; shapeId: string; props: Record<string, unknown> }
  | { type: "bringToFront"; shapeIds: string[] };

type LayoutReviewResult = {
  score: number;
  summary: string;
  findings: Array<{
    severity: "info" | "warning" | "error";
    category: "overflow" | "overlap" | "coverage" | "asset" | "typography" | "design";
    shapeIds: string[];
    message: string;
  }>;
  patches: LayoutReviewPatch[];
  source: "agents" | "deterministic";
};

const DEFAULT_PROMPT = "Premium product asset, preserve source product page typography, palette, and CTA style, no text";
const ASSET_DRAG_TYPE = "application/x-adframe-asset-id";
const ENABLE_CAROUSEL_FEATURES = false;
const TLDRAW_LICENSE_KEY = process.env.NEXT_PUBLIC_TLDRAW_LICENSE_KEY;

export default function EditorPage() {
  const router = useRouter();
  const product = useApprovedExtractionSnapshot();
  const [extraAssets, setExtraAssets] = useState<ProductAsset[]>([]);
  const [editor, setEditor] = useState<Editor | null>(null);
  const [preset, setPreset] = useState<ExportPreset>(EXPORT_PRESETS[0]);
  const [positionPreset, setPositionPreset] = useState<PositionPresetId>("cinema-mosaic");
  const [showPrice, setShowPrice] = useState(true);
  const [selected, setSelected] = useState<InspectorState | null>(null);
  const [exportOpen, setExportOpen] = useState(false);
  const [exportPresetId, setExportPresetId] = useState<ExportPreset["id"]>(EXPORT_PRESETS[0].id);
  const [styleOpen, setStyleOpen] = useState(false);
  const [safeMargins, setSafeMargins] = useState(true);
  const [busy, setBusy] = useState("");
  const [layoutReview, setLayoutReview] = useState<LayoutReviewResult | null>(null);
  const placementCounter = useRef(0);
  const composedExtractionKey = useRef("");
  const assets = [...extraAssets, ...product.assets];

  useEffect(() => {
    if (!isExtractionApproved()) router.replace("/analysis");
  }, [router]);

  const syncSelection = useCallback((nextEditor: Editor) => {
    const selectedShape = nextEditor.getSelectedShapes()[0];
    if (!selectedShape) {
      setSelected(null);
      return;
    }

    const props = selectedShape.props as Record<string, unknown>;
    setSelected({
      id: selectedShape.id,
      type: selectedShape.type,
      title: typeof props.title === "string" ? props.title : undefined,
      body: typeof props.body === "string" ? props.body : undefined,
      text: typeof props.text === "string" ? props.text : undefined,
      w: typeof props.w === "number" ? props.w : undefined,
      h: typeof props.h === "number" ? props.h : undefined,
      tone: typeof props.tone === "string" ? props.tone : undefined,
      src: typeof props.src === "string" ? props.src : undefined,
      bgRemoved: typeof props.bgRemoved === "boolean" ? props.bgRemoved : undefined,
    });
  }, []);

  const composeCanvas = useCallback(
    (
      nextEditor: Editor,
      nextProduct: ProductExtraction,
      nextPreset: ExportPreset,
      nextPositionPreset: PositionPresetId,
      nextShowPrice: boolean,
    ) => {
      const currentShapes = nextEditor.getCurrentPageShapes().map((shape) => shape.id);
      if (currentShapes.length) nextEditor.deleteShapes(currentShapes);
      nextEditor.createShapes(
        composeMainCanvasTemplate(nextProduct, nextPreset, nextPositionPreset, { showPrice: nextShowPrice }),
      );
      nextEditor.selectNone();
      nextEditor.zoomToFit();
      setSelected(null);
    },
    [],
  );

  function handleMount(nextEditor: Editor) {
    setEditor(nextEditor);
    const nextKey = extractionCanvasKey(product);
    composedExtractionKey.current = nextKey;
    composeCanvas(nextEditor, product, preset, positionPreset, showPrice);
    nextEditor.store.listen(() => syncSelection(nextEditor), { scope: "document" });
  }

  useEffect(() => {
    if (!editor || !product) return;
    const nextKey = extractionCanvasKey(product);
    if (nextKey === composedExtractionKey.current) return;
    composedExtractionKey.current = nextKey;
    setExtraAssets([]);
    composeCanvas(editor, product, preset, positionPreset, showPrice);
  }, [composeCanvas, editor, positionPreset, preset, product, showPrice]);

  function updatePreset(id: ExportPreset["id"]) {
    const nextPreset = EXPORT_PRESETS.find((item) => item.id === id) || EXPORT_PRESETS[0];
    setPreset(nextPreset);
    if (editor && product) composeCanvas(editor, product, nextPreset, positionPreset, showPrice);
  }

  function updatePositionPreset(id: PositionPresetId) {
    setPositionPreset(id);
    if (editor && product) composeCanvas(editor, product, preset, id, showPrice);
  }

  function updateShowPrice(nextShowPrice: boolean) {
    setShowPrice(nextShowPrice);
    if (editor && product) composeCanvas(editor, product, preset, positionPreset, nextShowPrice);
  }

  function openExportModal() {
    setExportPresetId(preset.id);
    setExportOpen(true);
  }

  function updateExportPreset(id: ExportPreset["id"]) {
    setExportPresetId(id);
  }

  function resolveExportPreset() {
    return EXPORT_PRESETS.find((item) => item.id === exportPresetId) || EXPORT_PRESETS[0];
  }

  async function ensureCanvasMatchesExportPreset(targetPreset: ExportPreset) {
    if (!editor || !product || targetPreset.id === preset.id) return;
    setPreset(targetPreset);
    composeCanvas(editor, product, targetPreset, positionPreset, showPrice);
  }

  function placeFeature(index: number) {
    if (!editor || !product) return;
    const feature = product.features[index];
    placementCounter.current += 1;
    const shapeId = createShapeId(`manual-feature-${index}-${placementCounter.current}`);
    editor.createShape<GlassCardShape>({
      id: shapeId,
      type: GLASS_CARD_TYPE,
      x: 110 + index * 28,
      y: 920,
      props: {
        w: 290,
        h: 230,
        title: feature.title,
        body: feature.body,
        tone: index === 1 ? "accent" : "tile",
        provenance: feature.provenance,
      },
    });
    editor.select(shapeId);
    syncSelection(editor);
  }

  function placeAsset(asset: ProductAsset, screenPoint?: { x: number; y: number }) {
    if (!editor) return;
    if (asset.mediaType === "video") {
      setBusy("Video source captured. Use it as motion reference; canvas video placement is not enabled yet.");
      return;
    }
    placementCounter.current += 1;
    const shapeId = createShapeId(`${asset.id}-${placementCounter.current}`);
    const placement = getAssetPlacement(asset);
    const pagePoint = screenPoint ? editor.screenToPage(screenPoint) : null;
    editor.createShape<CutoutImageShape>({
      id: shapeId,
      type: CUTOUT_IMAGE_TYPE,
      x: pagePoint ? pagePoint.x - placement.w / 2 : 360,
      y: pagePoint ? pagePoint.y - placement.h / 2 : 450,
      props: {
        w: placement.w,
        h: placement.h,
        src: asset.src,
        alt: asset.alt,
        fit: placement.fit,
        bgRemoved: Boolean(asset.bgRemoved),
        padding: placement.padding,
        radius: placement.radius,
        tileStyle: placement.tileStyle,
        caption: asset.caption,
        semanticGroup: asset.semanticGroup,
        provenance: asset.provenance,
      },
    });
    editor.select(shapeId);
    syncSelection(editor);
    setBusy(screenPoint ? "Asset placed at drop point." : "Asset copied to canvas.");
  }

  function startAssetDrag(event: DragEvent<HTMLButtonElement>, asset: ProductAsset) {
    if (asset.mediaType === "video") {
      event.preventDefault();
      return;
    }

    event.stopPropagation();
    event.dataTransfer.clearData();
    event.dataTransfer.effectAllowed = "copy";
    event.dataTransfer.setData(ASSET_DRAG_TYPE, asset.id);
  }

  function handleCanvasDragOver(event: DragEvent<HTMLDivElement>) {
    if (!Array.from(event.dataTransfer.types).includes(ASSET_DRAG_TYPE)) return;
    event.preventDefault();
    event.stopPropagation();
    event.dataTransfer.dropEffect = "copy";
  }

  function handleCanvasDrop(event: DragEvent<HTMLDivElement>) {
    const assetId = event.dataTransfer.getData(ASSET_DRAG_TYPE);
    if (!assetId) return;

    event.preventDefault();
    event.stopPropagation();
    const asset = assets.find((item) => item.id === assetId);
    if (!asset) return;

    placeAsset(asset, { x: event.clientX, y: event.clientY });
  }

  function duplicateSelected() {
    if (!editor || !selected) return;
    editor.duplicateShapes([selected.id], { x: 24, y: 24 });
    syncSelection(editor);
  }

  function bringSelectedToFront() {
    if (!editor || !selected) return;
    editor.bringToFront([selected.id]);
  }

  function sendSelectedToBack() {
    if (!editor || !selected) return;
    editor.sendToBack([selected.id]);
  }

  function updateSelected(patch: Record<string, unknown>) {
    if (!editor || !selected) return;
    editor.updateShape({
      id: selected.id,
      type: selected.type,
      props: patch,
    });
    syncSelection(editor);
  }

  function switchSelectedAsset() {
    if (!editor || !selected?.src || selected.type !== CUTOUT_IMAGE_TYPE) return;

    const imageAssets = assets.filter((asset) => asset.mediaType !== "video");
    if (imageAssets.length < 2) {
      setBusy("No alternate image assets available.");
      return;
    }

    const currentIndex = imageAssets.findIndex((asset) => asset.src === selected.src);
    const nextAsset =
      currentIndex >= 0
        ? imageAssets[(currentIndex + 1) % imageAssets.length]
        : imageAssets.find((asset) => asset.src !== selected.src) || imageAssets[0];
    const presentation = getAssetTilePresentation(nextAsset, "manual");

    updateSelected({
      src: nextAsset.src,
      alt: nextAsset.alt,
      fit: presentation.fit,
      bgRemoved: Boolean(nextAsset.bgRemoved),
      padding: presentation.padding,
      radius: presentation.radius,
      tileStyle: presentation.tileStyle,
      caption: nextAsset.caption,
      semanticGroup: nextAsset.semanticGroup,
      provenance: nextAsset.provenance,
    });
    setBusy(`Switched selected asset to ${nextAsset.name}.`);
  }

  async function runSegmentation() {
    if (!editor || !selected?.src) return;
    setBusy("Removing background with remove.bg...");

    try {
      const response = await fetch("/api/remove-background", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ src: selected.src }),
      });

      if (response.ok) {
        const result = (await response.json()) as { src: string; changed: boolean };
        updateSelected({ src: result.src, bgRemoved: result.changed || selected.bgRemoved });
        setBusy("");
        return;
      }
    } catch {
      // Fall through to the local model fallback below.
    }

    setBusy("remove.bg unavailable; trying local model...");
    const result = await removeBackgroundLocally(selected.src);
    updateSelected({ src: result.src, bgRemoved: result.changed || selected.bgRemoved });
    setBusy(result.changed ? "" : "Background removal unavailable; original image kept.");
  }

  async function generateVisual() {
    if (!editor) return;
    setBusy("Generating visual...");
    try {
      const designPrompt = product.designSystem
        ? `Use design.md tokens: accent ${product.designSystem.tokens.accent}, paper ${product.designSystem.tokens.paper}, ink ${product.designSystem.tokens.ink}, display font ${product.designSystem.tokens.fontDisplay}.`
        : "Use the product page visual style.";
      const response = await fetch("/api/generate-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: `${DEFAULT_PROMPT} ${designPrompt}` }),
      });
      if (!response.ok) throw new Error(await response.text());
      const asset = (await response.json()) as ProductAsset;
      setExtraAssets((current) => [asset, ...current]);
      placeAsset(asset);
      setBusy("");
    } catch {
      setBusy("Image generation failed. Try again or upload an asset.");
    }
  }

  async function reviewLayout() {
    if (!editor) return;
    const frame = getMainFrame(editor);
    if (!frame) {
      setBusy("No main canvas frame found.");
      return;
    }

    setBusy("Reviewing layout...");
    setLayoutReview(null);

    try {
      const image = await editor.toImage([frame.id], {
        format: "png",
        scale: 0.35,
        background: true,
      });
      const response = await fetch("/api/layout-review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageDataUrl: await blobToDataUrl(image.blob),
          exportPreset: preset,
          positionPreset,
          frame: {
            id: frame.id,
            width: getNumberProp(frame, "w", preset.width),
            height: getNumberProp(frame, "h", preset.height),
          },
          shapes: serializeReviewShapes(editor, frame.id),
          assets: assets.map(({ id, name, src, alt, kind, mediaType, bgRemoved, caption, semanticGroup }) => ({
            id,
            name,
            src,
            alt,
            kind,
            mediaType,
            bgRemoved: Boolean(bgRemoved),
            caption,
            semanticGroup,
          })),
          features: product.features.map(({ id, title, body }) => ({ id, title, body })),
        }),
      });

      if (!response.ok) throw new Error(await response.text());
      const result = (await response.json()) as LayoutReviewResult;
      const applied = applyLayoutReviewPatches(editor, frame.id, result.patches, assets);
      setLayoutReview(result);
      setBusy(`Layout reviewed: ${applied} fixes applied (${result.source}, score ${Math.round(result.score)}).`);
      syncSelection(editor);
    } catch {
      setBusy("Layout review failed. Try again after checking your canvas assets.");
    }
  }

  function applyStyle(style: StylePreset) {
    if (!editor) return;
    const shapes = editor.getCurrentPageShapes();
    const updates: TLShapePartial[] = [];

    shapes.forEach((shape) => {
      if (shape.type === GLASS_CARD_TYPE) {
        updates.push({ id: shape.id, type: shape.type, props: { tone: style.cardTone } });
        return;
      }

      if (shape.type === GLASS_TEXT_TYPE) {
        const textShape = shape as GlassTextShape;
        updates.push({
          id: shape.id,
          type: shape.type,
          props: { size: Math.round(textShape.props.size * style.headlineScale) },
        });
      }
    });

    if (updates.length) editor.updateShapes(updates);
    setStyleOpen(false);
  }

  async function exportActive(format: "png" | "jpeg" | "pdf" | "zip") {
    if (!editor) return;
    setBusy("Preparing export...");
    const targetPreset = resolveExportPreset();
    await ensureCanvasMatchesExportPreset(targetPreset);
    const frame = editor.getCurrentPageShapes().find((shape) => shape.type === "frame");
    if (!frame) return;

    if (format === "pdf") await downloadPdfProof(editor, frame.id, targetPreset);
    else if (format === "zip") {
      const carouselFrameIds = getCarouselFrameIds(editor);
      if (carouselFrameIds.length) await downloadCarouselFramesZip(editor, carouselFrameIds);
      else await downloadCarouselSlidesZip(product);
    } else await downloadFrame(editor, frame.id, targetPreset, format);

    setBusy("");
    setExportOpen(false);
  }

  function generateCarouselSplit() {
    if (!editor) return;
    const existingCarouselShapes = editor
      .getCurrentPageShapes()
      .filter((shape) => String(shape.id).includes("carousel-"))
      .map((shape) => shape.id);
    if (existingCarouselShapes.length) editor.deleteShapes(existingCarouselShapes);

    const { shapes, frameIds } = composeCarouselSplitTemplate(product, EXPORT_PRESETS[0]);
    editor.createShapes(shapes);
    if (frameIds[0]) editor.select(frameIds[0]);
    setBusy(`Created ${frameIds.length} editable carousel slides`);
  }

  return (
    <AppShell>
      <section className="app-grid">
        <aside className="grid content-start gap-4">
          <div className="panel liquid-glass">
            <div className="panel-inner">
              <p className="section-label">Assets ({assets.length})</p>
              <div className="grid gap-3 scroll-list">
                {assets.map((asset) => (
                  <button
                    className="asset-card text-left"
                    aria-disabled={asset.mediaType === "video"}
                    draggable={asset.mediaType !== "video"}
                    key={asset.id}
                    onClick={() => placeAsset(asset)}
                    onDragStart={(event) => startAssetDrag(event, asset)}
                    title={asset.mediaType === "video" ? "Video preview is available in Source Assets; canvas placement is image-only for now." : undefined}
                    type="button"
                  >
                    <div className="asset-thumb">
                      {asset.mediaType === "video" ? (
                        <video src={asset.src} muted playsInline controls preload="metadata" />
                      ) : (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img draggable={false} src={asset.src} alt={asset.alt} />
                      )}
                    </div>
                    <div className="mt-3 flex items-center justify-between gap-2">
                      <span className="text-sm text-white/78">{asset.name}</span>
                      <ProvenanceChip provenance={asset.provenance} />
                    </div>
                  </button>
                ))}
              </div>
              <button className="btn ghost mt-4 w-full" onClick={generateVisual} type="button">
                <WandSparkles size={15} />
                AI regenerate visual
              </button>
            </div>
          </div>

          <div className="panel liquid-glass">
            <div className="panel-inner">
              <p className="section-label">Copy ({product.features.length})</p>
              <div className="grid gap-3 scroll-list">
                {product.features.map((feature, index) => (
                  <button
                    className="feature-row text-left"
                    key={feature.id}
                    onClick={() => placeFeature(index)}
                    type="button"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <strong className="font-heading text-2xl font-normal leading-none tracking-[-.035em]">
                        {feature.title}
                      </strong>
                      <ProvenanceChip provenance={feature.provenance} />
                    </div>
                    <p className="mt-2 text-xs leading-5 text-white/56">{feature.body}</p>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </aside>

        <section className="grid gap-4" style={{ width: "100%", maxWidth: 720, margin: "0 auto" }}>
          <div className="panel liquid-glass">
            <div className="panel-inner flex flex-wrap items-center justify-between gap-3 py-4">
              <div>
                <p className="section-label mb-1">Glass canvas</p>
                <h1 className="font-heading text-2xl leading-tight tracking-[-.03em]">{product.name}</h1>
              </div>
              <div className="flex flex-wrap gap-2">
                <select
                  aria-label="Export size"
                  className="w-auto"
                  onChange={(event) => updatePreset(event.target.value as ExportPreset["id"])}
                  value={preset.id}
                >
                  {EXPORT_PRESETS.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.label}
                    </option>
                  ))}
                </select>
                <select
                  aria-label="Position preset"
                  className="w-auto"
                  onChange={(event) => updatePositionPreset(event.target.value as PositionPresetId)}
                  value={positionPreset}
                >
                  {POSITION_PRESETS.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.label}
                    </option>
                  ))}
                </select>
                <label className="btn ghost">
                  <input
                    checked={showPrice}
                    className="h-4 w-4 accent-white"
                    onChange={(event) => updateShowPrice(event.target.checked)}
                    type="checkbox"
                  />
                  Price
                </label>
                <button
                  aria-label="Undo"
                  className="btn ghost"
                  onClick={() => editor?.undo()}
                  title="Undo"
                  type="button"
                >
                  <RotateCcw size={15} />
                </button>
                <button
                  aria-label="Redo"
                  className="btn ghost"
                  onClick={() => editor?.redo()}
                  title="Redo"
                  type="button"
                >
                  <RotateCw size={15} />
                </button>
                <button
                  aria-label="Duplicate selection"
                  className="btn ghost"
                  onClick={() => editor?.duplicateShapes(editor.getSelectedShapeIds())}
                  title="Duplicate selection"
                  type="button"
                >
                  <Copy size={15} />
                </button>
                <button className="btn ghost" onClick={() => setStyleOpen(true)} type="button">
                  <Sparkles size={15} />
                  Presets
                </button>
                <button className="btn ghost" onClick={reviewLayout} type="button">
                  <CheckCircle2 size={15} />
                  Review layout
                </button>
                <button className="btn liquid-glass-strong" onClick={openExportModal} type="button">
                  <ArrowDownToLine size={15} />
                  Export
                </button>
              </div>
            </div>
          </div>

          <div
            className="editor-stage"
            onDragOverCapture={handleCanvasDragOver}
            onDropCapture={handleCanvasDrop}
            style={
              {
                "--stage-ratio": preset.ratio,
                ...(product.designSystem
                  ? {
                      "--brand-accent": product.designSystem.tokens.accent,
                      "--brand-ink": product.designSystem.tokens.ink,
                      "--brand-paper": product.designSystem.tokens.paper,
                      "--brand-rule": product.designSystem.tokens.rule,
                      "--brand-font-display": product.designSystem.tokens.fontDisplay,
                      "--brand-font-body": product.designSystem.tokens.fontBody,
                    }
                  : {}),
              } as CSSProperties
            }
          >
            {!TLDRAW_LICENSE_KEY ? (
              <div className="editor-license-banner">
                Add <code>NEXT_PUBLIC_TLDRAW_LICENSE_KEY</code> in Vercel and redeploy. tldraw blanks the
                canvas on production without a license after ~5 seconds.{" "}
                <a href="https://tldraw.dev/get-a-license/trial" rel="noreferrer" target="_blank">
                  Get a free 100-day trial key
                </a>
                .
              </div>
            ) : null}
            <Tldraw
              hideUi
              licenseKey={TLDRAW_LICENSE_KEY}
              onMount={handleMount}
              shapeUtils={adFrameShapeUtils}
            />
          </div>

          <div className="panel liquid-glass">
            <div className="panel-inner flex flex-wrap items-center justify-between gap-3 py-4">
              <div className="flex flex-wrap gap-2">
                <button className="btn ghost" onClick={() => editor?.zoomToFit()} type="button">
                  <Maximize2 size={15} />
                  Zoom to fit
                </button>
                {ENABLE_CAROUSEL_FEATURES ? (
                  <button className="btn ghost" onClick={generateCarouselSplit} type="button">
                    <Layers size={15} />
                    Carousel split
                  </button>
                ) : null}
                <label className="btn ghost">
                  <ImagePlus size={15} />
                  Upload asset
                  <input
                    className="hidden"
                    accept="image/*"
                    type="file"
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (!file) return;
                      const reader = new FileReader();
                      reader.onload = () => {
                        const asset: ProductAsset = {
                          id: `upload-${Date.now()}`,
                          name: file.name.replace(/\.[^.]+$/, ""),
                          src: String(reader.result),
                          alt: file.name,
                          provenance: "verified",
                          kind: "upload",
                          bgRemoved: false,
                          caption: file.name.replace(/\.[^.]+$/, ""),
                          semanticGroup: `upload-${file.name.replace(/\.[^.]+$/, "").toLowerCase()}`,
                        };
                        setExtraAssets((current) => [asset, ...current]);
                        placeAsset(asset);
                      };
                      reader.readAsDataURL(file);
                    }}
                  />
                </label>
              </div>
              <span className="text-sm text-white/52">{busy || "Ready"}</span>
            </div>
            {layoutReview ? (
              <div className="px-6 pb-5 text-xs leading-5 text-white/58">
                <strong className="text-white/76">{layoutReview.summary}</strong>
                {layoutReview.findings[0] ? <span> {layoutReview.findings[0].message}</span> : null}
              </div>
            ) : null}
          </div>
        </section>

        <aside className="grid content-start gap-4">
          <div className="panel liquid-glass">
            <div className="panel-inner">
              <p className="section-label">Inspector</p>
              {!selected ? (
                <p className="rounded-3xl bg-white/[.045] p-4 text-sm leading-6 text-white/58">
                  Select a card, text block, or image on the canvas to edit object-level
                  properties.
                </p>
              ) : (
                <div className="grid gap-4">
                  {selected.title !== undefined ? (
                    <div className="field">
                      <label>Title</label>
                      <input
                        onChange={(event) => updateSelected({ title: event.target.value })}
                        value={selected.title}
                      />
                    </div>
                  ) : null}
                  {selected.body !== undefined ? (
                    <div className="field">
                      <label>Body</label>
                      <textarea
                        onChange={(event) => updateSelected({ body: event.target.value })}
                        value={selected.body}
                      />
                    </div>
                  ) : null}
                  {selected.text !== undefined ? (
                    <div className="field">
                      <label>Text</label>
                      <textarea
                        onChange={(event) => updateSelected({ text: event.target.value })}
                        value={selected.text}
                      />
                    </div>
                  ) : null}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="field">
                      <label>Width</label>
                      <input
                        onChange={(event) => updateSelected({ w: Number(event.target.value) })}
                        type="number"
                        value={Math.round(selected.w || 0)}
                      />
                    </div>
                    <div className="field">
                      <label>Height</label>
                      <input
                        onChange={(event) => updateSelected({ h: Number(event.target.value) })}
                        type="number"
                        value={Math.round(selected.h || 0)}
                      />
                    </div>
                  </div>
                  {selected.tone ? (
                    <div className="field">
                      <label>Glass tone</label>
                      <select
                        onChange={(event) => updateSelected({ tone: event.target.value })}
                        value={selected.tone}
                      >
                        <option value="frost">Frost</option>
                        <option value="ink">Ink</option>
                        <option value="clear">Clear</option>
                        <option value="tile">Tile</option>
                        <option value="accent">Accent</option>
                        <option value="paper">Paper</option>
                        <option value="orange">Orange</option>
                      </select>
                    </div>
                  ) : null}
                  <div className="grid grid-cols-3 gap-2">
                    <button className="btn ghost" onClick={duplicateSelected} type="button">
                      Duplicate
                    </button>
                    <button className="btn ghost" onClick={bringSelectedToFront} type="button">
                      Bring front
                    </button>
                    <button className="btn ghost" onClick={sendSelectedToBack} type="button">
                      Send back
                    </button>
                  </div>
                  {selected.src ? (
                    <div className="grid gap-2">
                      <button className="btn white" onClick={switchSelectedAsset} type="button">
                        <Repeat2 size={15} />
                        Change asset
                      </button>
                      <button className="btn white" onClick={runSegmentation} type="button">
                        Remove background with remove.bg
                      </button>
                    </div>
                  ) : null}
                  <button
                    className="btn ghost"
                    onClick={() => {
                      editor?.deleteShapes([selected.id]);
                      setSelected(null);
                    }}
                    type="button"
                  >
                    Delete selected
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="panel liquid-glass">
            <div className="panel-inner">
              <p className="section-label">Layers</p>
              <div className="grid gap-2">
                {editor?.getCurrentPageShapes().map((shape) => (
                  <button
                    className="layer-row text-left text-sm text-white/68"
                    key={shape.id}
                    onClick={() => editor.select(shape.id)}
                    type="button"
                  >
                    <strong className="block text-white">{shape.type}</strong>
                    <span>{shape.id}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </aside>
      </section>

      {exportOpen ? (
        <Modal title="Export social assets" onClose={() => setExportOpen(false)}>
          <div className="grid gap-3">
            <p className="text-sm leading-6 text-white/62">
              Choose a layout format, then export the canvas as PNG, JPG, or PDF proof.
              {safeMargins
                ? " Safe margins are preserved by the frame bounds."
                : " Bleed mode exports the full frame without extra margin guides."}
            </p>
            <label className="flex items-center justify-between rounded-3xl border border-white/10 bg-white/[.045] p-4 text-sm text-white/70">
              Keep safe margins
              <input
                className="h-5 w-5 accent-white"
                checked={safeMargins}
                onChange={(event) => setSafeMargins(event.target.checked)}
                type="checkbox"
              />
            </label>
            <div className="grid gap-3 md:grid-cols-3">
              {EXPORT_PRESETS.map((item) => {
                const selected = exportPresetId === item.id;
                return (
                  <button
                    aria-pressed={selected}
                    className={`rounded-3xl border p-4 text-left transition ${
                      selected
                        ? "border-white/35 bg-white/[.12] ring-1 ring-white/20"
                        : "border-white/10 bg-white/[.045] hover:border-white/20 hover:bg-white/[.07]"
                    }`}
                    key={item.id}
                    onClick={() => updateExportPreset(item.id)}
                    type="button"
                  >
                    <div
                      className="mx-auto rounded-2xl border border-white/20 bg-black/50"
                      style={{
                        aspectRatio: item.ratio,
                        width: item.id === "story" ? 56 : 74,
                      }}
                    />
                    <p className="mt-3 text-center text-xs text-white/55">
                      {item.label}
                      <br />
                      {item.width}x{item.height}
                    </p>
                  </button>
                );
              })}
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <button className="btn white" onClick={() => exportActive("png")} type="button">
                <FileImage size={15} />
                PNG {resolveExportPreset().width}x{resolveExportPreset().height}
              </button>
              <button className="btn ghost" onClick={() => exportActive("jpeg")} type="button">
                <FileImage size={15} />
                JPG
              </button>
              <button className="btn ghost" onClick={() => exportActive("pdf")} type="button">
                <FileText size={15} />
                PDF proof
              </button>
              {ENABLE_CAROUSEL_FEATURES ? (
                <button className="btn ghost" onClick={() => exportActive("zip")} type="button">
                  <FileArchive size={15} />
                  Carousel ZIP (3-5 slides)
                </button>
              ) : null}
            </div>
          </div>
        </Modal>
      ) : null}

      {styleOpen ? (
        <Modal title="Style preset drawer" onClose={() => setStyleOpen(false)}>
          <div className="grid gap-3">
            {STYLE_PRESETS.map((style) => (
              <button
                className="feature-row text-left"
                key={style.id}
                onClick={() => applyStyle(style)}
                type="button"
              >
                <h3 className="font-heading text-4xl leading-none tracking-[-.04em]">
                  {style.label}
                </h3>
                <p className="mt-2 text-sm leading-6 text-white/62">{style.description}</p>
              </button>
            ))}
          </div>
        </Modal>
      ) : null}
    </AppShell>
  );
}

function Modal({
  children,
  onClose,
  title,
}: {
  children: React.ReactNode;
  onClose: () => void;
  title: string;
}) {
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-5">
      <button
        aria-label="Close modal"
        className="app-modal-backdrop"
        onClick={onClose}
        type="button"
      />
      <div aria-modal="true" className="app-modal panel w-full max-w-2xl" role="dialog">
        <div className="panel-inner">
          <div className="mb-6 flex items-start justify-between gap-4">
            <h2 className="font-heading text-5xl leading-none tracking-[-.05em]">{title}</h2>
            <button className="btn ghost" onClick={onClose} type="button">
              Close
            </button>
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}

function getMainFrame(editor: Editor) {
  return editor
    .getCurrentPageShapes()
    .find((shape) => shape.type === "frame" && !String(shape.id).includes(CAROUSEL_FRAME_PREFIX));
}

function serializeReviewShapes(editor: Editor, frameId: TLShapeId) {
  return editor
    .getCurrentPageShapes()
    .filter((shape) => shape.id === frameId || shape.parentId === frameId)
    .map((shape) => ({
      id: String(shape.id),
      type: shape.type,
      parentId: shape.parentId ? String(shape.parentId) : undefined,
      x: shape.x,
      y: shape.y,
      props: shape.props as Record<string, unknown>,
    }));
}

function applyLayoutReviewPatches(
  editor: Editor,
  frameId: TLShapeId,
  patches: LayoutReviewPatch[],
  assets: ProductAsset[],
) {
  const frameShapeIds = new Set(
    editor
      .getCurrentPageShapes()
      .filter((shape) => shape.id === frameId || shape.parentId === frameId)
      .map((shape) => String(shape.id)),
  );
  const updates: TLShapePartial[] = [];
  let applied = 0;

  for (const patch of patches) {
    if (patch.type === "bringToFront") {
      const ids = patch.shapeIds.filter((id) => frameShapeIds.has(id)).map((id) => id as TLShapeId);
      if (ids.length) {
        editor.bringToFront(ids);
        applied += ids.length;
      }
      continue;
    }

    if (!frameShapeIds.has(patch.shapeId)) continue;
    const shape = editor.getShape(patch.shapeId as TLShapeId);
    if (!shape) continue;

    if (patch.type === "moveResize") {
      updates.push({
        id: shape.id,
        type: shape.type,
        x: patch.x,
        y: patch.y,
        props: {
          ...(patch.w !== undefined ? { w: patch.w } : {}),
          ...(patch.h !== undefined ? { h: patch.h } : {}),
        },
      } as TLShapePartial);
      applied += 1;
      continue;
    }

    if (patch.type === "swapAsset") {
      const asset = assets.find((item) => item.id === patch.assetId);
      const presentation = asset ? getAssetTilePresentation(asset, "manual") : null;
      updates.push({
        id: shape.id,
        type: shape.type,
        props: {
          src: patch.src,
          alt: patch.alt,
          fit: presentation?.fit || patch.fit,
          ...(presentation
            ? {
                padding: presentation.padding,
                radius: presentation.radius,
                tileStyle: presentation.tileStyle,
              }
            : {}),
        },
      } as TLShapePartial);
      applied += 1;
      continue;
    }

    if (patch.type === "updateProps") {
      updates.push({
        id: shape.id,
        type: shape.type,
        props: patch.props,
      } as TLShapePartial);
      applied += 1;
    }
  }

  if (updates.length) editor.updateShapes(updates);
  return applied;
}

function getNumberProp(shape: TLShape, key: string, fallback: number) {
  const value = (shape.props as Record<string, unknown>)[key];
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function blobToDataUrl(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error);
    reader.onload = () => resolve(String(reader.result));
    reader.readAsDataURL(blob);
  });
}

function getAssetPlacement(asset: ProductAsset): AssetTilePresentation & {
  h: number;
  w: number;
} {
  const presentation = getAssetTilePresentation(asset, "manual");

  if (asset.kind === "section") {
    return { ...presentation, w: 360, h: 205 };
  }

  if (asset.kind === "hero") {
    return { ...presentation, w: 520, h: 340 };
  }

  return { ...presentation, w: 460, h: 320 };
}

function extractionCanvasKey(product: ProductExtraction) {
  return [
    product.url,
    product.model,
    product.extractedAt,
    product.headline,
    product.assets.map((asset) => `${asset.id}:${asset.src}`).join("|"),
    product.features.map((feature) => `${feature.id}:${feature.title}:${feature.body}`).join("|"),
  ].join("::");
}

function getCarouselFrameIds(editor: Editor) {
  return editor
    .getCurrentPageShapes()
    .filter((shape) => shape.type === "frame" && String(shape.id).includes(CAROUSEL_FRAME_PREFIX))
    .sort((a, b) => a.x - b.x)
    .map((shape) => shape.id);
}
