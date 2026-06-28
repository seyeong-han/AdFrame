import fixture from "../fixtures/samsung-s90f.json";
import { EXPORT_PRESETS, type ProductExtraction } from "../lib/types";
import { CAROUSEL_FRAME_PREFIX, composeAppleCleanTemplate, composeCarouselSplitTemplate } from "../lib/tldraw/templates";
import {
  CANVAS_BG_TYPE,
  CUTOUT_IMAGE_TYPE,
  GLASS_CARD_TYPE,
  GLASS_TEXT_TYPE,
} from "../lib/tldraw/shapes/fridgeframe-shapes";

const DARK_TONES = new Set(["tile", "ink", "frost", "clear", "accent"]);

const shapes = composeAppleCleanTemplate(fixture as ProductExtraction, EXPORT_PRESETS[0]);
const carousel = composeCarouselSplitTemplate(fixture as ProductExtraction, EXPORT_PRESETS[0]);

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

if (canvasBackgrounds.length !== 1) {
  throw new Error(`Expected exactly one dark canvas-background shape, got ${canvasBackgrounds.length}`);
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
  `template composition ok: dark canvas bg + ${sectionVisuals.length} section visuals, ${featureCards.length} feature cards, ${accentShapes.length} accent shapes, ${textShapes.length} text shapes; carousel split ${carousel.frameIds.length} editable frames`,
);
process.exit(0);
