import { access } from "node:fs/promises";
import path from "node:path";

const endpoint = process.env.ADFRAME_EXTRACT_URL || "http://127.0.0.1:3028/api/extract";
const root = process.cwd();
const expectedNeedle = "us-feature-catch-hidden-details-in-dark-scenes-545617641";

const response = await fetch(endpoint, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({
    url: "https://www.samsung.com/us/tvs/oled-tv/77-class-oled-tvs90f-sku-qn77s90fafxza/",
  }),
});

if (!response.ok) {
  throw new Error(`Extraction failed: ${response.status} ${await response.text()}`);
}

const extraction = await response.json();
const videoAssets = extraction.assets.filter((asset) => asset.mediaType === "video" || asset.kind === "video");
const expected = videoAssets.find((asset) => asset.src.includes(expectedNeedle) || asset.name.includes("Hidden details"));

if (!expected) {
  throw new Error(`Expected hidden-details MP4 video asset. Got: ${videoAssets.map((asset) => asset.src).join(", ")}`);
}

if (!expected.src.startsWith("/generated/videos/qn77s90fafxza/") || !expected.src.endsWith(".mp4")) {
  throw new Error(`Expected cached local MP4 path, got ${expected.src}`);
}

await access(path.join(root, "public", expected.src.replace(/^\//, "")));

console.log(`video extraction ok: ${expected.src}`);
