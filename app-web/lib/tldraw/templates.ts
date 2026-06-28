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
        bgRemoved: Boolean(ambientSection.bgRemoved),
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
          bgRemoved: Boolean(sectionAsset.bgRemoved),
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
  const margin = 46 * scale;
  const gap = 20 * scale;
  const accent = "#ff7a1a";
  const showPrice = options.showPrice ?? true;
  const contentW = preset.width - margin * 2;
  const contentH = preset.height - margin * 2;
  const topH = Math.round(240 * scale);
  const heroRowH = Math.round(330 * scale);
  const middleH = Math.round(260 * scale);
  const bottomH = contentH - topH - heroRowH - middleH - gap * 3;
  const topY = margin;
  const heroY = topY + topH + gap;
  const middleY = heroY + heroRowH + gap;
  const bottomY = middleY + middleH + gap;
  const topTileW = (contentW - gap) / 2;
  const heroSideW = Math.round(245 * scale);
  const heroW = contentW - heroSideW - gap;
  const heroX = margin;
  const heroSideX = heroX + heroW + gap;
  const priceH = Math.round(128 * scale);
  const heroSideAssetH = heroRowH - priceH - gap;
  const middleLeftW = Math.round(285 * scale);
  const middleRightW = Math.round(245 * scale);
  const middleCopyW = contentW - middleLeftW - middleRightW - gap * 2;
  const middleCopyH = (middleH - gap) / 2;
  const leftX = margin;
  const middleCopyX = leftX + middleLeftW + gap;
  const rightX = middleCopyX + middleCopyW + gap;
  const bottomLeftW = Math.round(170 * scale);
  const bottomRightW = Math.round(230 * scale);
  const bottomCenterW = contentW - bottomLeftW - bottomRightW - gap * 2;
  const bottomCenterX = leftX + bottomLeftW + gap;
  const bottomRightX = bottomCenterX + bottomCenterW + gap;
  const bottomLeftCopyH = Math.round(106 * scale);
  const bottomLeftAssetH = Math.round(130 * scale);
  const bottomLeftAssetY = bottomY + bottomLeftCopyH + gap;
  const bottomRightCopyH = Math.round(74 * scale);
  const bottomRightAssetH = bottomH - bottomRightCopyH - gap;
  const usedAssetIds = new Set<string>();
  if (hero?.id) usedAssetIds.add(hero.id);
  const nextAsset = (slot: "feature" | "detail", feature?: ProductFeature, preferredAssets = sectionAssets) => {
    const preferred = preferredAssets.filter((asset) => !usedAssetIds.has(asset.id));
    const fallback = imageAssets.filter((asset) => !usedAssetIds.has(asset.id));
    const asset = pickAssetForSlot(preferred.length ? preferred : fallback.length ? fallback : imageAssets, slot, feature, hero?.id);
    if (asset?.id) usedAssetIds.add(asset.id);
    return asset;
  };

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

  const topLeftAsset = nextAsset("feature", features[0]);
  const topRightAsset = nextAsset("feature", features[1] || features[0]);
  const heroSideAsset = nextAsset("detail", features[2] || features[0], imageAssets);
  const middleLeftAsset = nextAsset("feature", features[2] || features[0]);
  const middleRightAsset = nextAsset("feature", features[1] || features[0]);
  const bottomLeftAsset = nextAsset("detail", features[2], imageAssets);
  const bottomCenterAsset = nextAsset("feature", features[3] || features[1] || features[0]);
  const bottomRightAsset = nextAsset("detail", features[3], imageAssets);

  if (topLeftAsset) {
    shapes.push({
      id: createShapeId("apple-top-left-asset"),
      parentId: frameId,
      type: CUTOUT_IMAGE_TYPE,
      x: leftX,
      y: topY,
      props: {
        w: topTileW,
        h: topH,
        src: topLeftAsset.src,
        alt: topLeftAsset.alt,
        fit: topLeftAsset.kind === "section" ? "cover" : "contain",
        bgRemoved: Boolean(topLeftAsset.bgRemoved),
        provenance: topLeftAsset.provenance,
      },
    });
  }

  if (topRightAsset) {
    shapes.push({
      id: createShapeId("apple-top-right-asset"),
      parentId: frameId,
      type: CUTOUT_IMAGE_TYPE,
      x: leftX + topTileW + gap,
      y: topY,
      props: {
        w: topTileW,
        h: topH,
        src: topRightAsset.src,
        alt: topRightAsset.alt,
        fit: topRightAsset.kind === "section" ? "cover" : "contain",
        bgRemoved: Boolean(topRightAsset.bgRemoved),
        provenance: topRightAsset.provenance,
      },
    });
  }

  shapes.push(
    {
      id: createShapeId("apple-hero"),
      parentId: frameId,
      type: CUTOUT_IMAGE_TYPE,
      x: heroX,
      y: heroY,
      props: {
        w: heroW,
        h: heroRowH,
        src: hero?.src || "/fixtures/samsung-s90f/oled-tv.svg",
        alt: hero?.alt || product.name,
        fit: "contain",
        bgRemoved: hero?.bgRemoved ?? true,
        provenance: hero?.provenance || "verified",
      },
    },
  );

  shapes.push(
    showPrice
      ? {
          id: createShapeId("apple-price"),
          parentId: frameId,
          type: GLASS_CARD_TYPE,
          x: heroSideX,
          y: heroY,
          props: {
            w: heroSideW,
            h: priceH,
            title: product.price,
            body: product.previousPrice ? `was ${product.previousPrice}` : product.model,
            tone: "orange",
            provenance: "verified",
          },
        }
      : {
          id: createShapeId("apple-hero-side-copy"),
          parentId: frameId,
          type: GLASS_CARD_TYPE,
          x: heroSideX,
          y: heroY,
          props: {
            w: heroSideW,
            h: priceH,
            title: findFactValue(product, "sizes") || product.model,
            body: findFactValue(product, "sizes") ? "available sizes" : "model",
            tone: "paper",
            provenance: "verified",
          },
        },
  );

  if (heroSideAsset) {
    shapes.push({
      id: createShapeId("apple-hero-side-asset"),
      parentId: frameId,
      type: CUTOUT_IMAGE_TYPE,
      x: heroSideX,
      y: heroY + priceH + gap,
      props: {
        w: heroSideW,
        h: heroSideAssetH,
        src: heroSideAsset.src,
        alt: heroSideAsset.alt,
        fit: heroSideAsset.kind === "section" ? "cover" : "contain",
        bgRemoved: Boolean(heroSideAsset.bgRemoved),
        provenance: heroSideAsset.provenance,
      },
    });
  }

  if (middleLeftAsset) {
    shapes.push({
      id: createShapeId("apple-middle-left-asset"),
      parentId: frameId,
      type: CUTOUT_IMAGE_TYPE,
      x: leftX,
      y: middleY,
      props: {
        w: middleLeftW,
        h: middleH,
        src: middleLeftAsset.src,
        alt: middleLeftAsset.alt,
        fit: "cover",
        bgRemoved: Boolean(middleLeftAsset.bgRemoved),
        provenance: middleLeftAsset.provenance,
      },
    });
  }

  shapes.push(
    makeFeatureTile(
      "apple-middle-copy-1",
      frameId,
      middleCopyX,
      middleY,
      middleCopyW,
      middleCopyH,
      features[0],
      "paper",
    ),
    makeFeatureTile(
      "apple-middle-copy-2",
      frameId,
      middleCopyX,
      middleY + middleCopyH + gap,
      middleCopyW,
      middleCopyH,
      features[1] || features[0],
      "paper",
    ),
  );

  if (middleRightAsset) {
    shapes.push({
      id: createShapeId("apple-middle-right-asset"),
      parentId: frameId,
      type: CUTOUT_IMAGE_TYPE,
      x: rightX,
      y: middleY,
      props: {
        w: middleRightW,
        h: middleH,
        src: middleRightAsset.src,
        alt: middleRightAsset.alt,
        fit: "cover",
        bgRemoved: Boolean(middleRightAsset.bgRemoved),
        provenance: middleRightAsset.provenance,
      },
    });
  }

  shapes.push(
    makeFeatureTile(
      "apple-bottom-left-copy",
      frameId,
      leftX,
      bottomY,
      bottomLeftW,
      bottomLeftCopyH,
      features[2] || features[0],
      "paper",
    ),
  );

  if (bottomLeftAsset) {
    shapes.push({
      id: createShapeId("apple-bottom-left-asset"),
      parentId: frameId,
      type: CUTOUT_IMAGE_TYPE,
      x: leftX,
      y: bottomLeftAssetY,
      props: {
        w: bottomLeftW,
        h: bottomLeftAssetH,
        src: bottomLeftAsset.src,
        alt: bottomLeftAsset.alt,
        fit: bottomLeftAsset.kind === "section" ? "cover" : "contain",
        bgRemoved: Boolean(bottomLeftAsset.bgRemoved),
        provenance: bottomLeftAsset.provenance,
      },
    });
  }

  if (bottomCenterAsset) {
    shapes.push({
      id: createShapeId("apple-bottom-center-asset"),
      parentId: frameId,
      type: CUTOUT_IMAGE_TYPE,
      x: bottomCenterX,
      y: bottomY,
      props: {
        w: bottomCenterW,
        h: bottomH,
        src: bottomCenterAsset.src,
        alt: bottomCenterAsset.alt,
        fit: "cover",
        bgRemoved: Boolean(bottomCenterAsset.bgRemoved),
        provenance: bottomCenterAsset.provenance,
      },
    });
  }

  if (bottomRightAsset) {
    shapes.push({
      id: createShapeId("apple-bottom-right-asset"),
      parentId: frameId,
      type: CUTOUT_IMAGE_TYPE,
      x: bottomRightX,
      y: bottomY,
      props: {
        w: bottomRightW,
        h: bottomRightAssetH,
        src: bottomRightAsset.src,
        alt: bottomRightAsset.alt,
        fit: bottomRightAsset.kind === "section" ? "cover" : "contain",
        bgRemoved: Boolean(bottomRightAsset.bgRemoved),
        provenance: bottomRightAsset.provenance,
      },
    });
  }

  shapes.push(
    makeFeatureTile(
      "apple-bottom-right-copy",
      frameId,
      bottomRightX,
      bottomY + bottomRightAssetH + gap,
      bottomRightW,
      bottomRightCopyH,
      features[3] || features[1] || features[0],
      "paper",
    ),
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
