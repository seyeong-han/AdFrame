"use client";

import { jsPDF } from "jspdf";
import JSZip from "jszip";
import type { Editor, TLShapeId } from "tldraw";
import { EXPORT_PRESETS, type ExportPreset, type ProductExtraction, type ProductFeature } from "@/lib/types";

export async function exportFrameImage(
  editor: Editor,
  frameId: TLShapeId,
  preset: ExportPreset,
  format: "png" | "jpeg" = "png",
) {
  const result = await editor.toImage([frameId], {
    format,
    scale: preset.width / 1080,
    background: true,
  });
  return result.blob;
}

export async function downloadFrame(
  editor: Editor,
  frameId: TLShapeId,
  preset: ExportPreset,
  format: "png" | "jpeg",
) {
  const blob = await exportFrameImage(editor, frameId, preset, format);
  downloadBlob(blob, `adframe-${preset.id}.${format === "jpeg" ? "jpg" : "png"}`);
}

export async function downloadPdfProof(editor: Editor, frameId: TLShapeId, preset: ExportPreset) {
  const blob = await exportFrameImage(editor, frameId, preset, "jpeg");
  const dataUrl = await blobToDataUrl(blob);
  const pdf = new jsPDF({
    orientation: preset.height > preset.width ? "portrait" : "landscape",
    unit: "px",
    format: [preset.width, preset.height],
  });
  pdf.addImage(dataUrl, "JPEG", 0, 0, preset.width, preset.height);
  pdf.save(`adframe-${preset.id}-proof.pdf`);
}

export async function downloadCarouselZip(editor: Editor, frameId: TLShapeId) {
  const zip = new JSZip();

  for (const preset of EXPORT_PRESETS) {
    const blob = await exportFrameImage(editor, frameId, preset, "png");
    zip.file(`adframe-${preset.id}.png`, blob);
  }

  const zipped = await zip.generateAsync({ type: "blob" });
  downloadBlob(zipped, "adframe-carousel-pack.zip");
}

export async function downloadCarouselSlidesZip(product: ProductExtraction) {
  const zip = new JSZip();
  const features = product.features.slice(0, 5);

  for (const [index, feature] of features.entries()) {
    const blob = await renderSlide(product, feature, index, features.length);
    zip.file(`slide-${String(index + 1).padStart(2, "0")}-${slug(feature.title)}.png`, blob);
  }

  const zipped = await zip.generateAsync({ type: "blob" });
  downloadBlob(zipped, "adframe-carousel-slides.zip");
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function blobToDataUrl(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error);
    reader.onload = () => resolve(String(reader.result));
    reader.readAsDataURL(blob);
  });
}

async function renderSlide(
  product: ProductExtraction,
  feature: ProductFeature,
  index: number,
  total: number,
) {
  const canvas = document.createElement("canvas");
  canvas.width = 1080;
  canvas.height = 1350;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas rendering is unavailable.");

  const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
  gradient.addColorStop(0, "#101821");
  gradient.addColorStop(0.48, "#020406");
  gradient.addColorStop(1, "#000000");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "rgba(255,255,255,0.10)";
  roundRect(ctx, 72, 72, 936, 1206, 58);
  ctx.fill();
  ctx.strokeStyle = "rgba(255,255,255,0.24)";
  ctx.lineWidth = 2;
  ctx.stroke();

  const image = product.assets[index % product.assets.length];
  if (image) {
    await drawImage(ctx, image.src, 545, 220, 390, 300);
  }

  ctx.fillStyle = "rgba(255,255,255,0.7)";
  ctx.font = "500 26px Barlow, sans-serif";
  ctx.fillText(`${index + 1} / ${total}  Verified product story`, 126, 160);

  ctx.fillStyle = "#ffffff";
  ctx.font = "italic 112px Instrument Serif, Georgia, serif";
  wrapText(ctx, feature.title, 126, 600, 760, 100);

  ctx.fillStyle = "rgba(255,255,255,0.68)";
  ctx.font = "300 40px Barlow, sans-serif";
  wrapText(ctx, feature.body, 126, 835, 790, 58);

  ctx.fillStyle = "rgba(255,255,255,0.54)";
  ctx.font = "400 26px Barlow, sans-serif";
  ctx.fillText(product.model, 126, 1160);
  ctx.fillText(product.price, 126, 1202);

  return await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("Slide export failed."))), "image/png");
  });
}

async function drawImage(
  ctx: CanvasRenderingContext2D,
  src: string,
  x: number,
  y: number,
  w: number,
  h: number,
) {
  const image = new Image();
  image.crossOrigin = "anonymous";
  await new Promise<void>((resolve) => {
    image.onload = () => resolve();
    image.onerror = () => resolve();
    image.src = src;
  });

  if (image.complete && image.naturalWidth > 0) {
    const scale = Math.min(w / image.naturalWidth, h / image.naturalHeight);
    const dw = image.naturalWidth * scale;
    const dh = image.naturalHeight * scale;
    ctx.drawImage(image, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh);
  }
}

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
) {
  const words = text.split(/\s+/);
  let line = "";
  let offset = 0;

  words.forEach((word) => {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      ctx.fillText(line, x, y + offset);
      line = word;
      offset += lineHeight;
    } else {
      line = test;
    }
  });

  if (line) ctx.fillText(line, x, y + offset);
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  radius: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

function slug(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 48);
}
