import fixture from "../fixtures/samsung-s90f.json";
import { EXPORT_PRESETS, type ProductExtraction } from "../lib/types";
import { composeAppleCleanTemplate } from "../lib/tldraw/templates";
import { CUTOUT_IMAGE_TYPE, GLASS_CARD_TYPE, GLASS_TEXT_TYPE } from "../lib/tldraw/shapes/fridgeframe-shapes";

const shapes = composeAppleCleanTemplate(fixture as ProductExtraction, EXPORT_PRESETS[0]);

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
const framed = shapes.filter((shape) => shape.type !== "frame").every((shape) => Boolean(shape.parentId));

if (sectionVisuals.length < 3) {
  throw new Error(`Expected at least 3 section visual image shapes, got ${sectionVisuals.length}`);
}

if (videoImages.length > 0) {
  throw new Error("Video assets should not be placed as image shapes in the static canvas template.");
}

if (featureCards.length < 3) {
  throw new Error(`Expected at least 3 editable feature cards, got ${featureCards.length}`);
}

if (textShapes.length < 2) {
  throw new Error(`Expected headline and subtitle text shapes, got ${textShapes.length}`);
}

if (!framed) {
  throw new Error("Every template shape except the frame should be parented to the export frame.");
}

console.log(
  `template composition ok: ${sectionVisuals.length} section visuals, ${featureCards.length} feature cards, ${textShapes.length} text shapes`,
);
process.exit(0);
