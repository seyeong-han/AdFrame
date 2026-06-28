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
  const imageAssets = product.assets.filter((asset) => asset.mediaType !== "video");
  const sectionAssets = imageAssets.filter((asset) => asset.kind === "section");
  const hero = imageAssets.find((asset) => asset.kind === "hero") || imageAssets[0];
  const features = product.features.slice(0, 4);
  const frameId = createShapeId("frame-social");
  const margin = 72 * scale;
  const gutter = 24 * scale;
  const bottomY = preset.height - 430 * scale;
  const tileW = (preset.width - margin * 2 - gutter * 2) / 3;
  const visualH = 132 * scale;
  const copyH = 208 * scale;

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
      x: 718 * scale,
      y: 96 * scale,
      props: {
        w: 290 * scale,
        h: 184 * scale,
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
      x: margin,
      y: 72 * scale,
      props: {
        w: 260 * scale,
        h: 56 * scale,
        text: "Verified PDP facts",
        tone: "tile",
        provenance: "verified",
      },
    },
    {
      id: createShapeId("headline"),
      parentId: frameId,
      type: GLASS_TEXT_TYPE,
      x: margin,
      y: 146 * scale,
      props: {
        w: 650 * scale,
        h: 176 * scale,
        text: product.headline,
        size: 82 * scale,
        align: "left",
        provenance: "inferred",
      },
    },
    {
      id: createShapeId("subtitle"),
      parentId: frameId,
      type: GLASS_TEXT_TYPE,
      x: margin,
      y: 318 * scale,
      props: {
        w: 520 * scale,
        h: 95 * scale,
        text: product.subtitle,
        size: 27 * scale,
        align: "left",
        provenance: "inferred",
      },
    },
    {
      id: createShapeId("badge-price-model"),
      parentId: frameId,
      type: BADGE_TYPE,
      x: margin,
      y: 438 * scale,
      props: {
        w: 350 * scale,
        h: 52 * scale,
        text: `${product.price} / ${product.model}`,
        tone: "accent",
        provenance: "verified",
      },
    },
    {
      id: createShapeId("hero-cutout"),
      parentId: frameId,
      type: CUTOUT_IMAGE_TYPE,
      x: 338 * scale,
      y: 392 * scale,
      props: {
        w: 650 * scale,
        h: 390 * scale,
        src: hero?.src || "/fixtures/samsung-s90f/oled-tv.svg",
        alt: hero?.alt || product.name,
        fit: "contain",
        bgRemoved: hero?.bgRemoved ?? true,
        provenance: hero?.provenance || "verified",
      },
    },
  );

  features.slice(0, 3).forEach((feature, index) => {
    const cardX = margin + index * (tileW + gutter);
    const sectionAsset = findSectionAssetForFeature(sectionAssets, feature.title, index);
    if (sectionAsset) {
      shapes.push({
        id: createShapeId(`section-visual-${index + 1}`),
        parentId: frameId,
        type: CUTOUT_IMAGE_TYPE,
        x: cardX,
        y: bottomY,
        props: {
          w: tileW,
          h: visualH,
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
      y: bottomY + visualH + 14 * scale,
      props: {
        w: tileW,
        h: copyH,
        title: feature.title,
        body: feature.body,
        tone: index === 1 ? "accent" : "tile",
        provenance: feature.provenance,
      },
    });
  });

  shapes.push({
    id: createShapeId("icon-motion"),
    parentId: frameId,
    type: ICON_TYPE,
    x: 864 * scale,
    y: 144 * scale,
    props: {
      w: 104 * scale,
      h: 104 * scale,
      icon: "motion",
      tone: "tile",
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
