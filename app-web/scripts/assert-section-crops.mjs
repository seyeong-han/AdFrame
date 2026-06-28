import { access } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const endpoint = process.env.ADFRAME_EXTRACT_URL || "http://127.0.0.1:3028/api/extract";
const root = process.cwd();

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
const sectionAssets = extraction.assets.filter((asset) => asset.kind === "section");

if (sectionAssets.length < 4) {
  throw new Error(`Expected at least 4 section assets, got ${sectionAssets.length}`);
}

for (const asset of sectionAssets) {
  const diskPath = path.join(root, "public", asset.src.replace(/^\//, ""));
  await access(diskPath);

  const image = sharp(diskPath);
  const metadata = await image.metadata();
  if (!metadata.width || !metadata.height) throw new Error(`Missing dimensions for ${asset.src}`);

  const stripHeight = Math.max(8, Math.floor(metadata.height * 0.08));
  const stats = await image
    .extract({
      left: 0,
      top: metadata.height - stripHeight,
      width: metadata.width,
      height: stripHeight,
    })
    .stats();

  const [r, g, b] = stats.channels;
  const luminance = r.mean * 0.299 + g.mean * 0.587 + b.mean * 0.114;
  if (luminance > 130) {
    throw new Error(
      `${asset.src} still has a bright caption band at the bottom; bottom luminance ${luminance.toFixed(1)}`,
    );
  }
}

console.log(`section crops ok: ${sectionAssets.map((asset) => asset.src).join(", ")}`);
