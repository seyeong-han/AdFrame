"use client";

import { useCallback, useEffect, useRef, useState, type CSSProperties, type DragEvent } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowDownToLine,
  Copy,
  FileArchive,
  FileImage,
  FileText,
  ImagePlus,
  Layers,
  Maximize2,
  RotateCcw,
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
import { downloadCarouselSlidesZip, downloadFrame, downloadPdfProof } from "@/lib/export";
import { isExtractionApproved, readExtraction, useExtractionSnapshot } from "@/lib/client-store";
import { removeBackgroundLocally } from "@/lib/segmentation";
import { EXPORT_PRESETS, type ExportPreset, type ProductAsset, type ProductExtraction } from "@/lib/types";
import { STYLE_PRESETS, type StylePreset } from "@/lib/presets";
import { carouselSlides, composeAppleCleanTemplate } from "@/lib/tldraw/templates";
import {
  CUTOUT_IMAGE_TYPE,
  GLASS_CARD_TYPE,
  GLASS_TEXT_TYPE,
  fridgeFrameShapeUtils,
  type CutoutImageShape,
  type GlassCardShape,
  type GlassTextShape,
} from "@/lib/tldraw/shapes/fridgeframe-shapes";

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

const DEFAULT_PROMPT = "Premium product asset, preserve source product page typography, palette, and CTA style, no text";
const ASSET_DRAG_TYPE = "application/x-adframe-asset-id";

export default function EditorPage() {
  const router = useRouter();
  const product = useExtractionSnapshot();
  const [extraAssets, setExtraAssets] = useState<ProductAsset[]>([]);
  const [editor, setEditor] = useState<Editor | null>(null);
  const [preset, setPreset] = useState<ExportPreset>(EXPORT_PRESETS[0]);
  const [selected, setSelected] = useState<InspectorState | null>(null);
  const [exportOpen, setExportOpen] = useState(false);
  const [carouselOpen, setCarouselOpen] = useState(false);
  const [styleOpen, setStyleOpen] = useState(false);
  const [safeMargins, setSafeMargins] = useState(true);
  const [busy, setBusy] = useState("");
  const placementCounter = useRef(0);
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
    (nextEditor: Editor, nextProduct: ProductExtraction, nextPreset: ExportPreset) => {
      const currentShapes = nextEditor.getCurrentPageShapes().map((shape) => shape.id);
      if (currentShapes.length) nextEditor.deleteShapes(currentShapes);
      nextEditor.createShapes(composeAppleCleanTemplate(nextProduct, nextPreset));
      nextEditor.selectNone();
      nextEditor.zoomToFit();
      setSelected(null);
    },
    [],
  );

  function handleMount(nextEditor: Editor) {
    setEditor(nextEditor);
    const extraction = readExtraction();
    composeCanvas(nextEditor, extraction, preset);
    nextEditor.store.listen(() => syncSelection(nextEditor), { scope: "document" });
  }

  function updatePreset(id: ExportPreset["id"]) {
    const nextPreset = EXPORT_PRESETS.find((item) => item.id === id) || EXPORT_PRESETS[0];
    setPreset(nextPreset);
    if (editor && product) composeCanvas(editor, product, nextPreset);
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
    const frame = editor.getCurrentPageShapes().find((shape) => shape.type === "frame");
    if (!frame) return;

    if (format === "pdf") await downloadPdfProof(editor, frame.id, preset);
    else if (format === "zip") await downloadCarouselSlidesZip(product);
    else await downloadFrame(editor, frame.id, preset, format);

    setBusy("");
  }

  const slides = carouselSlides(product);

  return (
    <AppShell>
      <section className="app-grid">
        <aside className="grid content-start gap-4">
          <div className="panel liquid-glass">
            <div className="panel-inner">
              <p className="section-label">Assets</p>
              <div className="grid gap-3">
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
              <p className="section-label">Copy</p>
              <div className="grid gap-3">
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

        <section className="grid gap-4">
          <div className="panel liquid-glass">
            <div className="panel-inner flex flex-wrap items-center justify-between gap-3 py-4">
              <div>
                <p className="section-label mb-1">Glass canvas</p>
                <h1 className="font-heading text-4xl leading-none tracking-[-.04em]">{product.name}</h1>
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
                <button
                  className="btn ghost"
                  onClick={() => editor?.undo()}
                  title="Undo"
                  type="button"
                >
                  <RotateCcw size={15} />
                </button>
                <button
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
                <button className="btn liquid-glass-strong" onClick={() => setExportOpen(true)} type="button">
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
              product.designSystem
                ? ({
                    "--brand-accent": product.designSystem.tokens.accent,
                    "--brand-ink": product.designSystem.tokens.ink,
                    "--brand-paper": product.designSystem.tokens.paper,
                    "--brand-rule": product.designSystem.tokens.rule,
                    "--brand-font-display": product.designSystem.tokens.fontDisplay,
                    "--brand-font-body": product.designSystem.tokens.fontBody,
                  } as CSSProperties)
                : undefined
            }
          >
            <Tldraw
              hideUi
              onMount={handleMount}
              shapeUtils={fridgeFrameShapeUtils}
            />
          </div>

          <div className="panel liquid-glass">
            <div className="panel-inner flex flex-wrap items-center justify-between gap-3 py-4">
              <div className="flex flex-wrap gap-2">
                <button className="btn ghost" onClick={() => editor?.zoomToFit()} type="button">
                  <Maximize2 size={15} />
                  Zoom to fit
                </button>
                <button className="btn ghost" onClick={() => setCarouselOpen(true)} type="button">
                  <Layers size={15} />
                  Carousel split
                </button>
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
                        };
                        setExtraAssets((current) => [asset, ...current]);
                        if (editor) {
                          placementCounter.current += 1;
                          editor.createShape<CutoutImageShape>({
                            id: createShapeId(`${asset.id}-${placementCounter.current}`),
                            type: CUTOUT_IMAGE_TYPE,
                            x: 360,
                            y: 450,
                            props: {
                              w: 460,
                              h: 320,
                              src: asset.src,
                              alt: asset.alt,
                              fit: "contain",
                              bgRemoved: false,
                              provenance: "verified",
                            },
                          });
                        }
                      };
                      reader.readAsDataURL(file);
                    }}
                  />
                </label>
              </div>
              <span className="text-sm text-white/52">{busy || "Ready"}</span>
            </div>
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
                    <button className="btn white" onClick={runSegmentation} type="button">
                      Remove background with remove.bg
                    </button>
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
              Export the current frame as Instagram Feed, Story, PDF proof, or a ZIP bundle.
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
              {EXPORT_PRESETS.map((item) => (
                <div className="rounded-3xl border border-white/10 bg-white/[.045] p-4" key={item.id}>
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
                </div>
              ))}
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              <button className="btn white" onClick={() => exportActive("png")} type="button">
                <FileImage size={15} />
                PNG {preset.width}x{preset.height}
              </button>
              <button className="btn ghost" onClick={() => exportActive("jpeg")} type="button">
                <FileImage size={15} />
                JPG
              </button>
              <button className="btn ghost" onClick={() => exportActive("pdf")} type="button">
                <FileText size={15} />
                PDF proof
              </button>
              <button className="btn ghost" onClick={() => exportActive("zip")} type="button">
                <FileArchive size={15} />
                Carousel ZIP (3-5 slides)
              </button>
            </div>
          </div>
        </Modal>
      ) : null}

      {carouselOpen ? (
        <Modal title="Carousel split view" onClose={() => setCarouselOpen(false)}>
          <div className="grid gap-3">
            {slides.map((slide, index) => (
              <article className="feature-row" key={slide.id}>
                <div className="flex items-center justify-between">
                  <span className="chip">Slide {index + 1}</span>
                  <ProvenanceChip provenance={slide.provenance} />
                </div>
                <h3 className="mt-3 font-heading text-4xl leading-none tracking-[-.04em]">
                  {slide.title}
                </h3>
                <p className="mt-2 text-sm leading-6 text-white/62">{slide.body}</p>
              </article>
            ))}
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
    <div className="fixed inset-0 z-[80] grid place-items-center bg-black/72 p-5">
      <div className="panel liquid-glass w-full max-w-2xl">
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

function getAssetPlacement(asset: ProductAsset): {
  fit: "contain" | "cover";
  h: number;
  w: number;
} {
  if (asset.kind === "section") {
    return { fit: "cover", w: 360, h: 205 };
  }

  if (asset.kind === "hero") {
    return { fit: "contain", w: 520, h: 340 };
  }

  return { fit: "contain", w: 460, h: 320 };
}
