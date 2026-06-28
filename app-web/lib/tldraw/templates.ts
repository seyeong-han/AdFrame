import { createShapeId, type TLShapeId, type TLShapePartial } from "tldraw";
import { EXPORT_PRESETS, type ExportPreset, type GlassTone, type ProductAsset, type ProductExtraction, type ProductFeature } from "@/lib/types";
import type { PositionPresetId } from "@/lib/presets";
import {
  BADGE_TYPE,
  CANVAS_BG_TYPE,
  CUTOUT_IMAGE_TYPE,
  GLASS_CARD_TYPE,
  GLASS_TEXT_TYPE,
  ICON_TYPE,
} from "@/lib/tldraw/shapes/fridgeframe-shapes";

const DEFAULT_ACCENT = "#1677ff";
export const CAROUSEL_FRAME_PREFIX = "carousel-slide-frame";

const DESIGN_W = 1080;

export function composeMainCanvasTemplate(
  product: ProductExtraction,
  preset: ExportPreset,
  positionPreset: PositionPresetId = "cinema-mosaic",
  options: { showPrice?: boolean } = {},
): TLShapePartial[] {
  if (positionPreset === "apple-infographic") return composeAppleInfographicTemplate(product, preset, options);
  return composeCinemaMosaicTemplate(product, preset, options);
}

export function composeAppleCleanTemplate(
  product: ProductExtraction,
  preset: ExportPreset,
): TLShapePartial[] {
  return composeCinemaMosaicTemplate(product, preset, { showPrice: true });
}

function composeCinemaMosaicTemplate(
  product: ProductExtraction,
  preset: ExportPreset,
  options: { showPrice?: boolean } = {},
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
  const showPrice = options.showPrice ?? true;

  const accent = product.designSystem?.tokens.accent || DEFAULT_ACCENT;

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
    {
      id: createShapeId("canvas-bg"),
      parentId: frameId,
      type: CANVAS_BG_TYPE,
      x: 0,
      y: 0,
      props: {
        w: preset.width,
        h: preset.height,
        accent,
        provenance: "generated",
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
  );

  if (showPrice) {
    shapes.push({
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
    });
  }

  shapes.push(
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

    const cardH = estimateFeatureCardHeight(feature.title, feature.body, tileW, scale);
    shapes.push({
      id: createShapeId(`feature-${index + 1}`),
      parentId: frameId,
      type: GLASS_CARD_TYPE,
      x: cardX,
      y: bottomY + visualH + 14 * scale,
      props: {
        w: tileW,
        h: cardH,
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

function composeAppleInfographicTemplate(
  product: ProductExtraction,
  preset: ExportPreset,
  options: { showPrice?: boolean } = {},
): TLShapePartial[] {
  const scale = preset.width / DESIGN_W;
  const imageAssets = product.assets.filter((asset) => asset.mediaType !== "video");
  const sectionAssets = imageAssets.filter((asset) => asset.kind === "section");
  const hero = pickHeroAsset(imageAssets);
  const features = product.features.slice(0, 4);
  const frameId = createShapeId("frame-social");
  const margin = 48 * scale;
  const gap = 16 * scale;
  const accent = "#ff7a1a";
  const heroW = preset.width * 0.52;
  const heroH = Math.min(430 * scale, preset.height * 0.33);
  const heroX = (preset.width - heroW) / 2;
  const heroY = preset.height * 0.32;
  const tileRadiusOffset = 0;
  const sideW = (preset.width - heroW - margin * 2 - gap * 2) / 2;
  const contentBottom = preset.height - margin;
  const showPrice = options.showPrice ?? true;

  const shapes: TLShapePartial[] = [
    {
      id: frameId,
      type: "frame",
      x: 0,
      y: 0,
      props: {
        w: preset.width,
        h: preset.height,
        name: `${preset.label} Apple infographic frame`,
      },
    },
    {
      id: createShapeId("canvas-bg"),
      parentId: frameId,
      type: CANVAS_BG_TYPE,
      x: 0,
      y: 0,
      props: {
        w: preset.width,
        h: preset.height,
        accent,
        variant: "light",
        provenance: "generated",
      },
    },
  ];

  const topDetail = pickAssetForSlot(imageAssets, "detail", features[0], hero?.id);
  if (topDetail) {
    shapes.push({
      id: createShapeId("apple-top-detail"),
      parentId: frameId,
      type: CUTOUT_IMAGE_TYPE,
      x: margin,
      y: 34 * scale,
      props: {
        w: 330 * scale,
        h: 92 * scale,
        src: topDetail.src,
        alt: topDetail.alt,
        fit: topDetail.kind === "section" ? "cover" : "contain",
        bgRemoved: Boolean(topDetail.bgRemoved),
        provenance: topDetail.provenance,
      },
    });
  }

  shapes.push(
    {
      id: createShapeId("apple-title"),
      parentId: frameId,
      type: GLASS_CARD_TYPE,
      x: 380 * scale,
      y: 34 * scale,
      props: {
        w: 652 * scale,
        h: 92 * scale,
        title: trimTitle(product.name, 42),
        body: product.model,
        tone: "paper",
        provenance: "verified",
      },
    },
    {
      id: createShapeId("apple-hero"),
      parentId: frameId,
      type: CUTOUT_IMAGE_TYPE,
      x: heroX,
      y: heroY,
      props: {
        w: heroW,
        h: heroH,
        src: hero?.src || "/fixtures/samsung-s90f/oled-tv.svg",
        alt: hero?.alt || product.name,
        fit: "contain",
        bgRemoved: hero?.bgRemoved ?? true,
        provenance: hero?.provenance || "verified",
      },
    },
  );

  if (showPrice) {
    shapes.push({
      id: createShapeId("apple-price"),
      parentId: frameId,
      type: GLASS_CARD_TYPE,
      x: preset.width - margin - sideW,
      y: 144 * scale,
      props: {
        w: sideW,
        h: 148 * scale,
        title: product.price,
        body: product.previousPrice ? `was ${product.previousPrice}` : "current price",
        tone: "orange",
        provenance: "verified",
      },
    });
  }

  const leftFeature = features[0];
  const rightFeature = features[1] || features[0];
  const lowerFeature = features[2] || features[0];
  const bottomFeature = features[3] || features[1] || features[0];
  const leftImage = pickAssetForSlot(sectionAssets, "feature", leftFeature, hero?.id);
  const rightImage = pickAssetForSlot(sectionAssets, "feature", rightFeature, hero?.id);
  const lowerImage = pickAssetForSlot(sectionAssets, "feature", lowerFeature, hero?.id);

  if (leftImage) {
    shapes.push({
      id: createShapeId("apple-left-image"),
      parentId: frameId,
      type: CUTOUT_IMAGE_TYPE,
      x: margin,
      y: 144 * scale,
      props: {
        w: sideW,
        h: 190 * scale,
        src: leftImage.src,
        alt: leftImage.alt,
        fit: "cover",
        bgRemoved: false,
        provenance: leftImage.provenance,
      },
    });
  }

  shapes.push(
    makeFeatureTile("apple-left-copy", frameId, margin, 350 * scale, sideW, 140 * scale, leftFeature, "paper"),
    makeFeatureTile(
      "apple-right-copy",
      frameId,
      preset.width - margin - sideW,
      310 * scale,
      sideW,
      160 * scale,
      rightFeature,
      "paper",
    ),
  );

  if (rightImage) {
    shapes.push({
      id: createShapeId("apple-right-image"),
      parentId: frameId,
      type: CUTOUT_IMAGE_TYPE,
      x: preset.width - margin - sideW,
      y: 490 * scale,
      props: {
        w: sideW,
        h: 170 * scale,
        src: rightImage.src,
        alt: rightImage.alt,
        fit: "cover",
        bgRemoved: false,
        provenance: rightImage.provenance,
      },
    });
  }

  const bottomY = Math.max(heroY + heroH + 34 * scale, preset.height * 0.68);
  const bottomTileW = (preset.width - margin * 2 - gap * 2) / 3;
  if (lowerImage) {
    shapes.push({
      id: createShapeId("apple-bottom-image"),
      parentId: frameId,
      type: CUTOUT_IMAGE_TYPE,
      x: margin,
      y: bottomY,
      props: {
        w: bottomTileW,
        h: contentBottom - bottomY,
        src: lowerImage.src,
        alt: lowerImage.alt,
        fit: "cover",
        bgRemoved: false,
        provenance: lowerImage.provenance,
      },
    });
  }

  shapes.push(
    makeFeatureTile(
      "apple-bottom-feature",
      frameId,
      margin + bottomTileW + gap,
      bottomY + tileRadiusOffset,
      bottomTileW,
      Math.min(210 * scale, contentBottom - bottomY),
      bottomFeature,
      "paper",
    ),
    {
      id: createShapeId("apple-spec-size"),
      parentId: frameId,
      type: GLASS_CARD_TYPE,
      x: margin + (bottomTileW + gap) * 2,
      y: bottomY,
      props: {
        w: bottomTileW,
        h: Math.min(210 * scale, contentBottom - bottomY),
        title: findFactValue(product, "sizes") || product.model,
        body: findFactValue(product, "sizes") ? "available sizes" : "model",
        tone: "paper",
        provenance: "verified",
      },
    },
  );

  return shapes;
}

function makeFeatureTile(
  seed: string,
  frameId: TLShapeId,
  x: number,
  y: number,
  w: number,
  h: number,
  feature: ProductFeature | undefined,
  tone: GlassTone,
): TLShapePartial {
  return {
    id: createShapeId(seed),
    parentId: frameId,
    type: GLASS_CARD_TYPE,
    x,
    y,
    props: {
      w,
      h,
      title: feature?.title || "Add feature",
      body: feature?.body || "Product detail unavailable.",
      tone,
      provenance: feature?.provenance || "generated",
    },
  };
}

// Card height is content-driven: padding + measured title/body lines so the
// dark-glass tile hugs its copy instead of using a fixed box height.
function estimateFeatureCardHeight(title: string, body: string, tileW: number, scale: number) {
  const padding = 24 * scale;
  const gap = 9 * scale;
  const contentW = Math.max(tileW - padding * 2, 40 * scale);

  const titleFont = 28 * scale;
  const bodyFont = 14 * scale;

  const titleText = title.trim();
  const titleCharsPerLine = Math.max(contentW / (titleFont * 0.58), 1);
  const titleLines = Math.max(1, Math.ceil(titleText.length / titleCharsPerLine));
  const titleH = titleLines * titleFont * 1.02;

  const bodyText = body.trim();
  const bodyCharsPerLine = Math.max(contentW / (bodyFont * 0.52), 1);
  const bodyLines = bodyText ? Math.max(1, Math.ceil(bodyText.length / bodyCharsPerLine)) : 0;
  const bodyH = bodyLines ? bodyLines * bodyFont * 1.3 : 0;

  const height = padding * 2 + titleH + (bodyH ? gap + bodyH : 0);
  return Math.round(Math.min(Math.max(height, 116 * scale), 280 * scale));
}

function describeAsset(asset: ProductAsset) {
  return `${asset.id} ${asset.name} ${asset.alt} ${asset.kind}`.toLowerCase();
}

function scoreAssetForSlot(
  asset: ProductAsset,
  slot: "hero" | "feature" | "detail",
  feature?: ProductFeature,
  excludeId?: string,
) {
  if (asset.id === excludeId) return -Infinity;
  const description = describeAsset(asset);
  let score = 0;

  if (slot === "hero") {
    if (asset.kind === "hero") score += 70;
    if (asset.bgRemoved) score += 25;
    if (description.includes("front")) score += 14;
    if (description.includes("perspective")) score += 10;
    if (asset.kind === "section") score -= 35;
  }

  if (slot === "feature") {
    if (asset.kind === "section") score += 50;
    if (asset.kind === "gallery") score += 8;
    if (feature) {
      feature.title
        .toLowerCase()
        .split(/\s+/)
        .filter((word) => word.length > 2)
        .forEach((word) => {
          if (description.includes(word)) score += 12;
        });
    }
  }

  if (slot === "detail") {
    if (asset.kind === "gallery") score += 38;
    if (asset.kind === "section") score += 26;
    if (description.includes("side") || description.includes("port") || description.includes("detail")) score += 18;
    if (asset.kind === "hero") score -= 18;
  }

  return score;
}

function pickHeroAsset(assets: ProductAsset[]) {
  return [...assets].sort((a, b) => scoreAssetForSlot(b, "hero") - scoreAssetForSlot(a, "hero"))[0];
}

function pickAssetForSlot(
  assets: ProductAsset[],
  slot: "hero" | "feature" | "detail",
  feature?: ProductFeature,
  excludeId?: string,
) {
  return [...assets].sort(
    (a, b) => scoreAssetForSlot(b, slot, feature, excludeId) - scoreAssetForSlot(a, slot, feature, excludeId),
  )[0];
}

function trimTitle(value: string, maxLength: number) {
  return value.length > maxLength ? `${value.slice(0, maxLength - 1).trim()}…` : value;
}

function findFactValue(product: ProductExtraction, idFragment: string) {
  return product.facts.find((fact) => fact.id.toLowerCase().includes(idFragment.toLowerCase()))?.value;
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

export function composeCarouselSplitTemplate(
  product: ProductExtraction,
  preset: ExportPreset = EXPORT_PRESETS[0],
): { shapes: TLShapePartial[]; frameIds: TLShapeId[] } {
  const scale = preset.width / DESIGN_W;
  const imageAssets = product.assets.filter((asset) => asset.mediaType !== "video");
  const sectionAssets = imageAssets.filter((asset) => asset.kind === "section");
  const hero = imageAssets.find((asset) => asset.kind === "hero") || imageAssets[0];
  const features = product.features.slice(0, 5);
  const accent = product.designSystem?.tokens.accent || DEFAULT_ACCENT;
  const frameGap = 140 * scale;
  const frameIds: TLShapeId[] = [];
  const shapes: TLShapePartial[] = [];

  features.forEach((feature, index) => {
    const slideNumber = index + 1;
    const frameId = createShapeId(`${CAROUSEL_FRAME_PREFIX}-${slideNumber}`);
    const x = (preset.width + frameGap) * slideNumber;
    const sectionAsset = findSectionAssetForFeature(sectionAssets, feature.title, index);
    const asset = sectionAsset || hero;
    const isSectionAsset = asset?.kind === "section";
    const cardH = estimateFeatureCardHeight(feature.title, feature.body, 936 * scale, scale);

    frameIds.push(frameId);
    shapes.push(
      {
        id: frameId,
        type: "frame",
        x,
        y: 0,
        props: {
          w: preset.width,
          h: preset.height,
          name: `Carousel Slide ${slideNumber}`,
        },
      },
      {
        id: createShapeId(`carousel-bg-${slideNumber}`),
        parentId: frameId,
        type: CANVAS_BG_TYPE,
        x: 0,
        y: 0,
        props: {
          w: preset.width,
          h: preset.height,
          accent,
          provenance: "generated",
        },
      },
      {
        id: createShapeId(`carousel-badge-${slideNumber}`),
        parentId: frameId,
        type: BADGE_TYPE,
        x: 72 * scale,
        y: 72 * scale,
        props: {
          w: 240 * scale,
          h: 52 * scale,
          text: `Slide ${slideNumber} / ${features.length}`,
          tone: slideNumber === 1 ? "accent" : "tile",
          provenance: feature.provenance,
        },
      },
      {
        id: createShapeId(`carousel-title-${slideNumber}`),
        parentId: frameId,
        type: GLASS_TEXT_TYPE,
        x: 72 * scale,
        y: 170 * scale,
        props: {
          w: 610 * scale,
          h: 188 * scale,
          text: feature.title,
          size: 82 * scale,
          align: "left",
          provenance: feature.provenance,
        },
      },
      {
        id: createShapeId(`carousel-image-${slideNumber}`),
        parentId: frameId,
        type: CUTOUT_IMAGE_TYPE,
        x: 610 * scale,
        y: 150 * scale,
        props: {
          w: 398 * scale,
          h: 330 * scale,
          src: asset?.src || "/fixtures/samsung-s90f/oled-tv.svg",
          alt: asset?.alt || product.name,
          fit: isSectionAsset ? "cover" : "contain",
          bgRemoved: asset?.bgRemoved ?? !isSectionAsset,
          provenance: asset?.provenance || "verified",
        },
      },
      {
        id: createShapeId(`carousel-copy-${slideNumber}`),
        parentId: frameId,
        type: GLASS_CARD_TYPE,
        x: 72 * scale,
        y: 565 * scale,
        props: {
          w: 936 * scale,
          h: Math.max(cardH, 210 * scale),
          title: feature.title,
          body: feature.body,
          tone: "tile",
          provenance: feature.provenance,
        },
      },
      {
        id: createShapeId(`carousel-footer-${slideNumber}`),
        parentId: frameId,
        type: BADGE_TYPE,
        x: 72 * scale,
        y: preset.height - 128 * scale,
        props: {
          w: 520 * scale,
          h: 52 * scale,
          text: `${product.model} · ${product.price}`,
          tone: "clear",
          provenance: "verified",
        },
      },
    );
  });

  return { shapes, frameIds };
}
