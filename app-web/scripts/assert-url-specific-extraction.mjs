import { readFile } from "node:fs/promises";

const source = await readFile("app/api/extract/route.ts", "utf8");

const forbiddenSnippets = [
  "/generated/removebg/samsung-s90f/",
  "/generated/sections/samsung-s90f/",
  "/generated/videos/samsung-s90f/",
  'haystack.includes("qn77s90fafxza")',
  'haystack.includes("s90f")',
].filter((snippet) => source.includes(snippet));

const requiredSnippets = [
  "type SamsungProductHints",
  "function getSamsungProductHints",
  "cacheNamespace",
  "hints.tokens.some((token) => haystack.includes(token))",
  "srcsetUrls",
  "css-background",
  "imageUrlsFromText(document.documentElement.innerHTML)",
  "loadCsvImageManifest(productHints)",
  "demo-image-map-${productHints.cacheNamespace}.csv",
  "CSV image manifest loaded from",
  "section-gaming",
  "extraSectionComponents",
  "removeBackgroundForExtractedAssets(liveAssets, productHints.cacheNamespace)",
  "cacheSectionComponentAssets(scrape.sectionComponents, productHints.cacheNamespace)",
  "cacheVideoAssets(scrape.videos, productHints.cacheNamespace)",
].filter((snippet) => !source.includes(snippet));

if (forbiddenSnippets.length > 0) {
  throw new Error(`Extractor still contains product-specific S90F cache/filter hardcoding: ${forbiddenSnippets.join(", ")}`);
}

if (requiredSnippets.length > 0) {
  throw new Error(`Extractor is missing URL-specific cache/filter contracts: ${requiredSnippets.join(", ")}`);
}

console.log("url-specific extraction ok");
