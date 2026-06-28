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
} from "@/lib/tldraw/shapes/adframe-shapes";

const DEFAULT_ACCENT = "#1677ff";
export const CAROUSEL_FRAME_PREFIX = "carousel-slide-frame";

const DESIGN_W = 1080;

export type AssetTileRole = "floating-hero" | "main" | "feature" | "detail" | "manual";

export type AssetTilePresentation = {
  fit: "contain" | "cover";
  padding: number;
  radius: number;
  tileStyle: "none" | "paper" | "glass" | "bleed";
};

export function getAssetTilePresentation(asset: ProductAsset, role: AssetTileRole = "manual"): AssetTilePresentation {
  const isCutout = asset.bgRemoved === true || asset.kind === "hero";
  const tileStyle = role === "floating-hero" ? "none" : "paper";

  if (isCutout) {
    return {
      fit: "contain",
      padding: role === "floating-hero" ? 0 : 18,
      radius: role === "floating-hero" ? 0 : 32,
      tileStyle,
    };
  }

  return {
    fit: "cover",
    padding: 0,
    radius: role === "main" ? 36 : 28,
    tileStyle,
  };
}

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
    const presentation = getAssetTilePresentation(ambientSection, "detail");
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
        fit: presentation.fit,
        bgRemoved: Boolean(ambientSection.bgRemoved),
        padding: presentation.padding * scale,
        radius: presentation.radius * scale,
        tileStyle: presentation.tileStyle,
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

  if (hero) {
    const presentation = getAssetTilePresentation(hero, "floating-hero");
    shapes.push({
      id: createShapeId("hero-cutout"),
      parentId: frameId,
      type: CUTOUT_IMAGE_TYPE,
      x: 338 * scale,
      y: 392 * scale,
      props: {
        w: 650 * scale,
        h: 390 * scale,
        src: hero.src,
        alt: hero.alt,
        fit: presentation.fit,
        bgRemoved: hero.bgRemoved,
        padding: presentation.padding * scale,
        radius: presentation.radius * scale,
        tileStyle: presentation.tileStyle,
        provenance: hero.provenance,
      },
    });
  }

  features.slice(0, 3).forEach((feature, index) => {
    const cardX = margin + index * (tileW + gutter);
    const sectionAsset = findSectionAssetForFeature(sectionAssets, feature.title, index);
    if (sectionAsset) {
      const presentation = getAssetTilePresentation(sectionAsset, "feature");
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
          fit: presentation.fit,
          bgRemoved: Boolean(sectionAsset.bgRemoved),
          padding: presentation.padding * scale,
          radius: presentation.radius * scale,
          tileStyle: presentation.tileStyle,
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
  const topH = Math.round(145 * scale);
  const secondH = Math.round(145 * scale);
  const heroRowH = Math.round(345 * scale);
  const lowerH = Math.round(280 * scale);
  const footerH = contentH - topH - secondH - heroRowH - lowerH - gap * 4;
  const topY = margin;
  const secondY = topY + topH + gap;
  const heroY = secondY + secondH + gap;
  const lowerY = heroY + heroRowH + gap;
  const footerY = lowerY + lowerH + gap;
  const topLeftW = Math.round(205 * scale);
  const topCopyW = Math.round(205 * scale);
  const topAssetW = contentW - topLeftW - topCopyW - gap * 2;
  const secondCopyW = Math.round(190 * scale);
  const secondRightAssetW = contentW - topLeftW - secondCopyW - gap * 2;
  const topMainX = margin + topLeftW + gap;
  const topRightX = topMainX + topAssetW + gap;
  const secondRightX = topMainX + secondCopyW + gap;
  const heroLeftW = Math.round(165 * scale);
  const heroSideW = Math.round(205 * scale);
  const heroW = contentW - heroLeftW - heroSideW - gap * 2;
  const heroX = margin + heroLeftW + gap;
  const heroSideX = heroX + heroW + gap;
  const priceH = Math.round(128 * scale);
  const heroLeftTileH = (heroRowH - gap) / 2;
  const heroSideAssetH = heroRowH - priceH - gap;
  const lowerLeftW = Math.round(290 * scale);
  const lowerRightW = Math.round(245 * scale);
  const lowerCopyW = contentW - lowerLeftW - lowerRightW - gap * 2;
  const lowerCopyH = (lowerH - gap) / 2;
  const leftX = margin;
  const lowerCopyX = leftX + lowerLeftW + gap;
  const rightX = lowerCopyX + lowerCopyW + gap;
  const footerLeftW = Math.round(165 * scale);
  const footerRightW = Math.round(170 * scale);
  const footerCenterW = contentW - footerLeftW - footerRightW - gap * 2;
  const footerCenterX = leftX + footerLeftW + gap;
  const footerRightX = footerCenterX + footerCenterW + gap;
  const usedAssetIds = new Set<string>();
  const usedSemanticGroups = new Set<string>();
  if (hero?.id) {
    usedAssetIds.add(hero.id);
    usedSemanticGroups.add(assetSemanticGroup(hero));
  }
  const nextAsset = (slot: "feature" | "detail", feature?: ProductFeature, preferredAssets = sectionAssets) => {
    const isUnused = (asset: ProductAsset) => !usedAssetIds.has(asset.id) && !usedSemanticGroups.has(assetSemanticGroup(asset));
    const preferred = preferredAssets.filter(isUnused);
    const fallback = imageAssets.filter(isUnused);
    const asset = pickAssetForSlot(preferred.length ? preferred : fallback, slot, feature, hero?.id);
    if (asset?.id) {
      usedAssetIds.add(asset.id);
      usedSemanticGroups.add(assetSemanticGroup(asset));
    }
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

  const pushAssetTile = (
    seed: string,
    asset: ProductAsset | undefined,
    x: number,
    y: number,
    w: number,
    h: number,
    fit?: "contain" | "cover",
  ) => {
    if (!asset) return;
    const presentation = getAssetTilePresentation(asset, seed.includes("hero") ? "main" : "feature");
    shapes.push({
      id: createShapeId(seed),
      parentId: frameId,
      type: CUTOUT_IMAGE_TYPE,
      x,
      y,
      props: {
        w,
        h,
        src: asset.src,
        alt: asset.alt,
        fit: fit || presentation.fit,
        bgRemoved: Boolean(asset.bgRemoved),
        padding: presentation.padding * scale,
        radius: presentation.radius * scale,
        tileStyle: presentation.tileStyle,
        caption: asset.caption,
        semanticGroup: assetSemanticGroup(asset),
        provenance: asset.provenance,
      },
    });
  };
  const pushAssetOrCopyTile = (
    seed: string,
    asset: ProductAsset | undefined,
    x: number,
    y: number,
    w: number,
    h: number,
    feature: ProductFeature | undefined,
    fit?: "contain" | "cover",
  ) => {
    if (asset) {
      pushAssetTile(seed, asset, x, y, w, h, fit);
      return;
    }
    shapes.push(makeFeatureTile(`${seed}-copy-fallback`, frameId, x, y, w, h, feature, "paper"));
  };

  const topLeftAsset = nextAsset("detail", features[0], imageAssets);
  const topAsset = nextAsset("feature", features[0]);
  const secondRightAsset = nextAsset("feature", features[2] || features[0]);
  const heroLeftAsset = nextAsset("detail", features[2] || features[0], imageAssets);
  const heroSideAsset = nextAsset("detail", features[3] || features[0], imageAssets);
  const footerCenterAsset = nextAsset("feature", features[3] || features[1] || features[0]);
  const lowerLeftAsset = nextAsset("feature", features[2] || features[0]);
  const lowerRightAsset = nextAsset("feature", features[1] || features[0]);
  const footerRightAsset = nextAsset("detail", features[3], imageAssets);

  pushAssetOrCopyTile("apple-top-left-asset", topLeftAsset, leftX, topY, topLeftW, topH + secondH + gap, features[0], "cover");
  pushAssetOrCopyTile("apple-top-asset", topAsset, topMainX, topY, topAssetW, topH, features[0]);
  shapes.push(
    makeFeatureTile(
      "apple-top-copy",
      frameId,
      topRightX,
      topY,
      topCopyW,
      topH,
      features[0],
      "paper",
    ),
  );

  shapes.push(
    makeFeatureTile(
      "apple-second-copy",
      frameId,
      topMainX,
      secondY,
      secondCopyW,
      secondH,
      features[1] || features[0],
      "paper",
    ),
  );
  pushAssetOrCopyTile("apple-second-right-asset", secondRightAsset, secondRightX, secondY, secondRightAssetW, secondH, features[2] || features[0]);
  pushAssetOrCopyTile("apple-middle-left-asset", heroLeftAsset, leftX, heroY, heroLeftW, heroLeftTileH, features[2] || features[0], "cover");
  shapes.push(
    makeFeatureTile(
      "apple-middle-left-copy",
      frameId,
      leftX,
      heroY + heroLeftTileH + gap,
      heroLeftW,
      heroLeftTileH,
      features[2] || features[0],
      "paper",
    ),
  );
  if (hero) {
    const presentation = getAssetTilePresentation(hero, "main");
    shapes.push({
      id: createShapeId("apple-hero"),
      parentId: frameId,
      type: CUTOUT_IMAGE_TYPE,
      x: heroX,
      y: heroY,
      props: {
        w: heroW,
        h: heroRowH,
        src: hero.src,
        alt: hero.alt,
        fit: presentation.fit,
        bgRemoved: hero.bgRemoved,
        padding: presentation.padding * scale,
        radius: presentation.radius * scale,
        tileStyle: presentation.tileStyle,
        caption: hero.caption,
        semanticGroup: assetSemanticGroup(hero),
        provenance: hero.provenance,
      },
    });
  } else {
    shapes.push(makeFeatureTile("apple-hero-missing-source", frameId, heroX, heroY, heroW, heroRowH, features[0], "paper"));
  }

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
      : makeFeatureTile("apple-hero-side-copy", frameId, heroSideX, heroY, heroSideW, priceH, features[0], "paper"),
  );
  pushAssetOrCopyTile("apple-hero-side-asset", heroSideAsset, heroSideX, heroY + priceH + gap, heroSideW, heroSideAssetH, features[3] || features[0]);

  pushAssetOrCopyTile("apple-bottom-left-asset", lowerLeftAsset, leftX, lowerY, lowerLeftW, lowerH, features[2] || features[0]);
  shapes.push(
    makeFeatureTile(
      "apple-middle-copy-1",
      frameId,
      lowerCopyX,
      lowerY,
      lowerCopyW,
      lowerCopyH,
      features[0],
      "paper",
    ),
    makeFeatureTile(
      "apple-middle-copy-2",
      frameId,
      lowerCopyX,
      lowerY + lowerCopyH + gap,
      lowerCopyW,
      lowerCopyH,
      features[1] || features[0],
      "paper",
    ),
  );
  pushAssetOrCopyTile("apple-bottom-right-asset", lowerRightAsset, rightX, lowerY, lowerRightW, lowerH, features[1] || features[0]);

  shapes.push(
    makeFeatureTile("apple-bottom-left-copy", frameId, leftX, footerY, footerLeftW, footerH, features[2] || features[0], "paper"),
  );
  pushAssetOrCopyTile("apple-bottom-center-asset", footerCenterAsset, footerCenterX, footerY, footerCenterW, footerH, features[3] || features[1] || features[0], "cover");
  pushAssetOrCopyTile("apple-footer-right-asset", footerRightAsset, footerRightX, footerY, footerRightW, footerH, features[3] || features[0]);

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
  return `${asset.id} ${asset.name} ${asset.alt} ${asset.kind} ${asset.caption || ""} ${asset.semanticGroup || ""}`.toLowerCase();
}

function assetSemanticGroup(asset: ProductAsset) {
  if (asset.semanticGroup) return asset.semanticGroup;
  return describeAsset(asset)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
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
    const presentation = asset ? getAssetTilePresentation(asset, isSectionAsset ? "feature" : "main") : null;
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

    if (asset) {
      shapes.push({
        id: createShapeId(`carousel-image-${slideNumber}`),
        parentId: frameId,
        type: CUTOUT_IMAGE_TYPE,
        x: 610 * scale,
        y: 150 * scale,
        props: {
          w: 398 * scale,
          h: 330 * scale,
          src: asset.src,
          alt: asset.alt,
          fit: presentation?.fit || (isSectionAsset ? "cover" : "contain"),
          bgRemoved: asset.bgRemoved,
          padding: (presentation?.padding || 0) * scale,
          radius: (presentation?.radius || 28) * scale,
          tileStyle: presentation?.tileStyle || "paper",
          provenance: asset.provenance,
        },
      });
    }
  });

  return { shapes, frameIds };
}
