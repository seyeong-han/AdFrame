import { createShapeId, type TLShapePartial } from "tldraw";
import type { ExportPreset, ProductAsset, ProductExtraction } from "@/lib/types";
import {
  BADGE_TYPE,
  CUTOUT_IMAGE_TYPE,
  GLASS_CARD_TYPE,
  GLASS_TEXT_TYPE,
  ICON_TYPE,
} from "@/lib/tldraw/shapes/fridgeframe-shapes";

const DESIGN_W = 1080;

export function composeAppleCleanTemplate(
  product: ProductExtraction,
  preset: ExportPreset,
): TLShapePartial[] {
  const scale = preset.width / DESIGN_W;
  const cardY = preset.height - 312 * scale;
  const imageAssets = product.assets.filter((asset) => asset.mediaType !== "video");
  const sectionAssets = imageAssets.filter((asset) => asset.kind === "section");
  const hero = imageAssets.find((asset) => asset.kind === "hero") || imageAssets[0];
  const features = product.features.slice(0, 4);
  const frameId = createShapeId("frame-social");

  const shapes: TLShapePartial[] = [
    {
      id: frameId,
      type: "frame",
      x: 0,
      y: 0,
      props: {
        w: preset.width,
        h: preset.height,
        name: `${preset.label} export frame`,
      },
    },
  ];

  const ambientSection = sectionAssets[3] || sectionAssets[0];
  if (ambientSection) {
    shapes.push({
      id: createShapeId("section-ambient-panel"),
      parentId: frameId,
      type: CUTOUT_IMAGE_TYPE,
      x: 710 * scale,
      y: 102 * scale,
      props: {
        w: 285 * scale,
        h: 205 * scale,
        src: ambientSection.src,
        alt: ambientSection.alt,
        fit: "cover",
        bgRemoved: false,
        provenance: ambientSection.provenance,
      },
    });
  }

  shapes.push(
    {
      id: createShapeId("badge-verified"),
      parentId: frameId,
      type: BADGE_TYPE,
      x: 72 * scale,
      y: 72 * scale,
      props: {
        w: 260 * scale,
        h: 56 * scale,
        text: "Verified PDP facts",
        tone: "clear",
        provenance: "verified",
      },
    },
    {
      id: createShapeId("headline"),
      parentId: frameId,
      type: GLASS_TEXT_TYPE,
      x: 72 * scale,
      y: 150 * scale,
      props: {
        w: 650 * scale,
        h: 168 * scale,
        text: product.headline,
        size: 90 * scale,
        align: "left",
        provenance: "inferred",
      },
    },
    {
      id: createShapeId("subtitle"),
      parentId: frameId,
      type: GLASS_TEXT_TYPE,
      x: 76 * scale,
      y: 332 * scale,
      props: {
        w: 545 * scale,
        h: 95 * scale,
        text: product.subtitle,
        size: 29 * scale,
        align: "left",
        provenance: "inferred",
      },
    },
    {
      id: createShapeId("badge-price-model"),
      parentId: frameId,
      type: BADGE_TYPE,
      x: 72 * scale,
      y: 450 * scale,
      props: {
        w: 350 * scale,
        h: 52 * scale,
        text: `${product.price} / ${product.model}`,
        tone: "ink",
        provenance: "verified",
      },
    },
    {
      id: createShapeId("hero-cutout"),
      parentId: frameId,
      type: CUTOUT_IMAGE_TYPE,
      x: 380 * scale,
      y: 390 * scale,
      props: {
        w: 620 * scale,
        h: 410 * scale,
        src: hero?.src || "/fixtures/samsung-s90f/oled-tv.svg",
        alt: hero?.alt || product.name,
        fit: "contain",
        bgRemoved: hero?.bgRemoved ?? true,
        provenance: hero?.provenance || "verified",
      },
    },
  );

  features.slice(0, 3).forEach((feature, index) => {
    const cardX = (72 + index * 315) * scale;
    const sectionAsset = findSectionAssetForFeature(sectionAssets, feature.title, index);
    if (sectionAsset) {
      shapes.push({
        id: createShapeId(`section-visual-${index + 1}`),
        parentId: frameId,
        type: CUTOUT_IMAGE_TYPE,
        x: cardX,
        y: cardY - 150 * scale,
        props: {
          w: 286 * scale,
          h: 132 * scale,
          src: sectionAsset.src,
          alt: sectionAsset.alt,
          fit: "cover",
          bgRemoved: false,
          provenance: sectionAsset.provenance,
        },
      });
    }

    shapes.push({
      id: createShapeId(`feature-${index + 1}`),
      parentId: frameId,
      type: GLASS_CARD_TYPE,
      x: cardX,
      y: cardY,
      props: {
        w: 286 * scale,
        h: 220 * scale,
        title: feature.title,
        body: feature.body,
        tone: index === 1 ? "ink" : "frost",
        provenance: feature.provenance,
      },
    });
  });

  shapes.push({
    id: createShapeId("icon-motion"),
    parentId: frameId,
    type: ICON_TYPE,
    x: 875 * scale,
    y: 128 * scale,
    props: {
      w: 92 * scale,
      h: 92 * scale,
      icon: "motion",
      tone: "frost",
      provenance: "verified",
    },
  });

  return shapes;
}

function findSectionAssetForFeature(assets: ProductAsset[], title: string, fallbackIndex: number) {
  const normalizedTitle = title.toLowerCase();
  const match = assets.find((asset) => {
    const haystack = `${asset.id} ${asset.name} ${asset.alt}`.toLowerCase();
    if (normalizedTitle.includes("processor")) return haystack.includes("processor");
    if (normalizedTitle.includes("upscaling")) return haystack.includes("upscaling");
    if (normalizedTitle.includes("hdr")) return haystack.includes("hdr");
    if (normalizedTitle.includes("motion") || normalizedTitle.includes("144")) {
      return haystack.includes("motion") || haystack.includes("xcelerator");
    }
    return normalizedTitle
      .split(/\s+/)
      .filter((word) => word.length > 3)
      .some((word) => haystack.includes(word));
  });

  return match || assets[fallbackIndex % Math.max(assets.length, 1)];
}

export function carouselSlides(product: ProductExtraction) {
  return product.features.slice(0, 5).map((feature, index) => ({
    id: `slide-${index + 1}`,
    title: feature.title,
    body: feature.body,
    image: product.assets[index % product.assets.length],
    provenance: feature.provenance,
  }));
}
