import fixture from "../fixtures/samsung-s90f.json";
import { EXPORT_PRESETS, type ProductExtraction } from "../lib/types";
import { CAROUSEL_FRAME_PREFIX, composeCarouselSplitTemplate, composeMainCanvasTemplate } from "../lib/tldraw/templates";
import {
  CANVAS_BG_TYPE,
  CUTOUT_IMAGE_TYPE,
  GLASS_CARD_TYPE,
  GLASS_TEXT_TYPE,
} from "../lib/tldraw/shapes/adframe-shapes";

const DARK_TONES = new Set(["tile", "ink", "frost", "clear", "accent"]);
const LIGHT_TONES = new Set(["paper", "orange"]);
const preset = EXPORT_PRESETS[0];
const product = fixture as ProductExtraction;
const assetsWithoutBackgroundFlag = product.assets.filter((asset) => typeof asset.bgRemoved !== "boolean");
const imageAssetsWithoutCaptionGroup = product.assets.filter(
  (asset) => asset.mediaType !== "video" && (!asset.caption?.trim() || !asset.semanticGroup?.trim()),
);

const shapes = composeMainCanvasTemplate(product, preset, "cinema-mosaic");
const appleShapes = composeMainCanvasTemplate(product, preset, "apple-infographic");
const hiddenPriceShapes = composeMainCanvasTemplate(product, preset, "cinema-mosaic", { showPrice: false });
const hiddenApplePriceShapes = composeMainCanvasTemplate(product, preset, "apple-infographic", { showPrice: false });
const carousel = composeCarouselSplitTemplate(product, preset);

const imageShapes = shapes.filter((shape) => shape.type === CUTOUT_IMAGE_TYPE);
const sectionVisuals = imageShapes.filter((shape) => {
  const props = shape.props as { src?: string; fit?: string };
  return props.src?.includes("/generated/sections/samsung-s90f/") && props.src.endsWith("-visual.jpg");
});
const videoImages = imageShapes.filter((shape) => {
  const props = shape.props as { src?: string };
  return props.src?.endsWith(".mp4");
});
const featureCards = shapes.filter((shape) => shape.type === GLASS_CARD_TYPE);
const textShapes = shapes.filter((shape) => shape.type === GLASS_TEXT_TYPE);
const canvasBackgrounds = shapes.filter((shape) => shape.type === CANVAS_BG_TYPE);
const framed = shapes.filter((shape) => shape.type !== "frame").every((shape) => Boolean(shape.parentId));
const emptyFeatureCards = featureCards.filter((shape) => {
  const props = shape.props as { title?: string; body?: string };
  return !props.title?.trim() || !props.body?.trim();
});
const darkReadableCards = featureCards.filter((shape) => {
  const props = shape.props as { tone?: string };
  return props.tone ? DARK_TONES.has(props.tone) : false;
});
const accentShapes = shapes.filter((shape) => {
  const props = shape.props as { tone?: string };
  return props.tone === "accent";
});
const verifiedBadges = shapes.filter((shape) => {
  const props = shape.props as { text?: string };
  return props.text === "Verified PDP facts";
});

if (assetsWithoutBackgroundFlag.length > 0) {
  throw new Error(
    `Every extracted fixture asset must include an explicit bgRemoved boolean. Missing: ${assetsWithoutBackgroundFlag.map((asset) => asset.id).join(", ")}`,
  );
}

if (imageAssetsWithoutCaptionGroup.length > 0) {
  throw new Error(
    `Every extracted fixture image asset must include caption and semanticGroup. Missing: ${imageAssetsWithoutCaptionGroup.map((asset) => asset.id).join(", ")}`,
  );
}

if (canvasBackgrounds.length !== 1) {
  throw new Error(`Expected exactly one dark canvas-background shape, got ${canvasBackgrounds.length}`);
}

if (verifiedBadges.length > 0) {
  throw new Error("The canvas should not include the old 'Verified PDP facts' badge.");
}

const firstChild = shapes.find((shape) => shape.type !== "frame");
if (!firstChild || firstChild.type !== CANVAS_BG_TYPE) {
  throw new Error("The dark canvas-background must be the first child of the export frame.");
}

if (sectionVisuals.length < 3) {
  throw new Error(`Expected at least 3 section visual image shapes, got ${sectionVisuals.length}`);
}

if (videoImages.length > 0) {
  throw new Error("Video assets should not be placed as image shapes in the static canvas template.");
}

if (featureCards.length < 3) {
  throw new Error(`Expected at least 3 editable feature cards, got ${featureCards.length}`);
}

if (emptyFeatureCards.length > 0) {
  throw new Error(`Expected no empty feature cards, got ${emptyFeatureCards.length}`);
}

if (darkReadableCards.length < 3) {
  throw new Error("Expected default feature cards to use dark-glass tones (DESIGN.md).");
}

if (accentShapes.length > 3) {
  throw new Error(`Accent must be used sparingly (<=3 per canvas), got ${accentShapes.length}`);
}

if (textShapes.length < 2) {
  throw new Error(`Expected headline and subtitle text shapes, got ${textShapes.length}`);
}

if (!framed) {
  throw new Error("Every template shape except the frame should be parented to the export frame.");
}

const hiddenPriceText = hiddenPriceShapes.some((shape) => JSON.stringify(shape.props).includes(product.price));
if (hiddenPriceText) {
  throw new Error("Cinema mosaic should not include price text when showPrice=false.");
}

const appleFrame = appleShapes.find((shape) => shape.type === "frame");
const appleBackgrounds = appleShapes.filter((shape) => shape.type === CANVAS_BG_TYPE);
const appleImages = appleShapes.filter((shape) => shape.type === CUTOUT_IMAGE_TYPE);
const appleCards = appleShapes.filter((shape) => shape.type === GLASS_CARD_TYPE);
const hasAppleShape = (idFragment: string) => appleShapes.some((shape) => String(shape.id).includes(idFragment));
const appleHero = appleImages.find((shape) => String(shape.id).includes("apple-hero"));
const appleTopLeftAsset = appleImages.find((shape) => String(shape.id).includes("apple-top-left-asset"));
const appleTopAsset = appleImages.find((shape) => String(shape.id).includes("apple-top-asset"));
const appleTopCopy = appleCards.find((shape) => String(shape.id).includes("apple-top-copy"));
const appleSecondCopy = appleCards.find((shape) => String(shape.id).includes("apple-second-copy"));
const appleHeroSideAsset = appleImages.find((shape) => String(shape.id).includes("apple-hero-side-asset"));
const appleBottomCenterAsset = appleImages.find((shape) => String(shape.id).includes("apple-bottom-center-asset"));
const appleMiddleLeftCopy = appleCards.find((shape) => String(shape.id).includes("apple-middle-left-copy"));
const appleMiddleCopyTiles = appleCards.filter((shape) => String(shape.id).includes("apple-middle-copy"));
const appleBottomLeftCopy = appleCards.find((shape) => String(shape.id).includes("apple-bottom-left-copy"));
const applePrice = appleCards.find((shape) => String(shape.id).includes("apple-price"));
const appleVideos = appleImages.filter((shape) => {
  const props = shape.props as { src?: string };
  return props.src?.endsWith(".mp4");
});
const appleLightCards = appleCards.filter((shape) => {
  const props = shape.props as { tone?: string };
  return props.tone ? LIGHT_TONES.has(props.tone) : false;
});
const appleFramed = appleShapes.filter((shape) => shape.type !== "frame").every((shape) => Boolean(shape.parentId));

if (!appleFrame) {
  throw new Error("Expected Apple infographic preset to include an export frame.");
}

if (appleBackgrounds.length !== 1) {
  throw new Error(`Expected one Apple infographic canvas background, got ${appleBackgrounds.length}`);
}

const appleBgProps = appleBackgrounds[0]?.props as { variant?: string };
if (appleBgProps.variant !== "light") {
  throw new Error("Expected Apple infographic background to use light variant.");
}

if (!appleHero) {
  throw new Error("Expected Apple infographic preset to include a main hero image.");
}

if (appleImages.length < 8) {
  throw new Error(`Expected Apple tile-board to include the available unique image scenes, got ${appleImages.length}`);
}

if (appleCards.length < 4) {
  throw new Error(`Expected dense Apple tile-board to include multiple editable copy/spec tiles, got ${appleCards.length}`);
}

if (appleLightCards.length < 4) {
  throw new Error("Expected Apple infographic tiles to use light paper/orange tones.");
}

const appleImageGroups = appleImages.map((shape) => {
  const props = shape.props as { semanticGroup?: string };
  return props.semanticGroup;
});
if (appleImageGroups.some((group) => !group)) {
  throw new Error("Expected every Apple image tile to carry a semanticGroup for duplicate prevention.");
}
if (new Set(appleImageGroups).size !== appleImageGroups.length) {
  throw new Error(`Expected Apple image tiles to avoid repeated semantic groups, got ${appleImageGroups.join(", ")}`);
}

if (!hasAppleShape("apple-top-left-asset") || !hasAppleShape("apple-top-asset") || !appleTopCopy) {
  throw new Error("Expected dense Apple tile-board to include the sketch's tall top-left slot, top asset slot, and top-right copy tile.");
}

if (!appleSecondCopy || !hasAppleShape("apple-second-right-asset")) {
  throw new Error("Expected dense Apple tile-board to include second-row copy plus right asset slot.");
}

if (!appleHeroSideAsset || !applePrice) {
  throw new Error("Expected dense Apple tile-board to include the sketch's right-side price/asset stack beside the main tile.");
}

if (!hasAppleShape("apple-middle-left-asset") || !appleMiddleLeftCopy) {
  throw new Error("Expected dense Apple tile-board to include the sketch's left asset/copy stack beside the main tile.");
}

if (!hasAppleShape("apple-bottom-left-asset") || !hasAppleShape("apple-bottom-center-asset") || !hasAppleShape("apple-bottom-right-asset") || !hasAppleShape("apple-footer-right-asset")) {
  throw new Error("Expected dense Apple tile-board to include lower left/right slots plus footer center/right slots.");
}

if (appleMiddleCopyTiles.length < 2 || !appleBottomLeftCopy) {
  throw new Error("Expected dense Apple tile-board to include middle stacked copy and footer-left copy.");
}

if (!appleTopLeftAsset || !appleTopAsset) {
  throw new Error("Expected top-left and top asset slots to use image assets in the fixture.");
}

const topAssetProps = appleTopAsset.props as { w?: number };
const topCopyProps = appleTopCopy.props as { w?: number };
const topLeftProps = appleTopLeftAsset.props as { h?: number };
if ((topAssetProps.w || 0) <= (topCopyProps.w || 0) || (appleTopCopy.x || 0) <= ((appleTopAsset.x || 0) + (topAssetProps.w || 0)) || (topLeftProps.h || 0) <= 260) {
  throw new Error("Expected the top area to place a tall left asset plus wide asset before compact copy.");
}

const heroProps = appleHero.props as { h?: number; w?: number };
const priceProps = applePrice.props as { h?: number; w?: number };
if ((heroProps.w || 0) < 500 || (heroProps.h || 0) < 300 || (applePrice.x || 0) <= ((appleHero.x || 0) + (heroProps.w || 0))) {
  throw new Error("Expected the main tile to be centered between a left asset and right price stack.");
}

const middleLeftAsset = appleImages.find((shape) => String(shape.id).includes("apple-middle-left-asset"));
const middleLeftAssetProps = middleLeftAsset?.props as { h?: number } | undefined;
const middleLeftCopyProps = appleMiddleLeftCopy.props as { h?: number } | undefined;
if (
  !middleLeftAsset ||
  (middleLeftAssetProps?.h || 0) >= (heroProps.h || 0) ||
  Math.abs((middleLeftAssetProps?.h || 0) - (middleLeftCopyProps?.h || 0)) > 4
) {
  throw new Error("Expected the main-left column to split into similarly sized asset and copy tiles.");
}

if ((priceProps.w || 0) < 180 || (priceProps.h || 0) < 90) {
  throw new Error("Expected the price tile to be a compact right-side card beside the main asset.");
}

if (!appleBottomCenterAsset) {
  throw new Error("Expected footer-center slot to use a dominant image asset in the fixture.");
}

const bottomCenterProps = appleBottomCenterAsset.props as { h?: number; w?: number };
if ((bottomCenterProps.w || 0) < 560 || (bottomCenterProps.h || 0) < 240) {
  throw new Error("Expected the footer-center asset to be the dominant bottom tile.");
}

if (appleVideos.length > 0) {
  throw new Error("Apple infographic must not place MP4/video assets as static image shapes.");
}

if (!appleFramed) {
  throw new Error("Every Apple infographic shape except the frame should be parented to the export frame.");
}

const hiddenApplePriceText = hiddenApplePriceShapes.some((shape) => JSON.stringify(shape.props).includes(product.price));
if (hiddenApplePriceText) {
  throw new Error("Apple infographic should not include price text when showPrice=false.");
}

const carouselFrames = carousel.shapes.filter((shape) => shape.type === "frame");
const carouselBackgrounds = carousel.shapes.filter((shape) => shape.type === CANVAS_BG_TYPE);
const carouselCards = carousel.shapes.filter((shape) => shape.type === GLASS_CARD_TYPE);
const carouselImages = carousel.shapes.filter((shape) => shape.type === CUTOUT_IMAGE_TYPE);
const carouselVideos = carouselImages.filter((shape) => {
  const props = shape.props as { src?: string };
  return props.src?.endsWith(".mp4");
});
const carouselFramed = carousel.shapes
  .filter((shape) => shape.type !== "frame")
  .every((shape) => Boolean(shape.parentId));

if (carousel.frameIds.length < 3 || carousel.frameIds.length > 5) {
  throw new Error(`Expected 3-5 editable carousel frame ids, got ${carousel.frameIds.length}`);
}

if (carouselFrames.length !== carousel.frameIds.length) {
  throw new Error(`Expected carousel frame count to match frame ids (${carousel.frameIds.length}), got ${carouselFrames.length}`);
}

if (!carousel.frameIds.every((id) => String(id).includes(CAROUSEL_FRAME_PREFIX))) {
  throw new Error(`Expected every carousel frame id to include ${CAROUSEL_FRAME_PREFIX}.`);
}

if (carouselBackgrounds.length !== carousel.frameIds.length) {
  throw new Error("Each editable carousel slide must include a dark canvas-background shape.");
}

if (carouselCards.length < carousel.frameIds.length) {
  throw new Error("Each editable carousel slide must include an editable copy card.");
}

if (carouselImages.length < carousel.frameIds.length) {
  throw new Error("Each editable carousel slide must include an editable image shape.");
}

if (carouselVideos.length > 0) {
  throw new Error("Carousel split must not place MP4/video assets as static image shapes.");
}

if (!carouselFramed) {
  throw new Error("Every carousel slide child shape should be parented to a carousel frame.");
}

console.log(
  `template composition ok: cinema mosaic + sketch Apple tile-board (${appleImages.length} images, right-side price stack) + carousel split ${carousel.frameIds.length} editable frames`,
);
process.exit(0);
