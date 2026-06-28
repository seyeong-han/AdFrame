import { NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import OpenAI from "openai";
import sharp from "sharp";
import { z } from "zod";
import fixture from "@/fixtures/samsung-s90f.json";
import { getRemoveBgApiKey, isServerlessDeploy } from "@/lib/server-env";
import type { ProductAsset, ProductDesignSystem, ProductExtraction, ProductFeature } from "@/lib/types";
import { SAMSUNG_DEMO_URL } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 60;

const RequestSchema = z.object({
  url: z.string().url().default(SAMSUNG_DEMO_URL),
});

const HighlightSchema = z.object({
  title: z.string(),
  body: z.string(),
});

const NormalizedSchema = z.object({
  headline: z.string(),
  subtitle: z.string(),
  features: z.array(HighlightSchema).min(3).max(5),
});

type ScrapeResult = {
  title: string;
  price?: string;
  previousPrice?: string;
  highlights: string[];
  images: ImageCandidateSignal[];
  sectionComponents: SectionComponentSignal[];
  videos: VideoSignal[];
  design: RawDesignSignals;
};

type SamsungProductHints = {
  cacheNamespace: string;
  sku?: string;
  series?: string;
  tokens: string[];
};

type SectionComponentSignal = {
  id: string;
  title: string;
  src: string;
  alt: string;
  extraction: "dom-image" | "section-crop" | "ocr-recreation";
};

type ImageCandidateSignal = {
  src: string;
  alt: string;
  role: string;
  title: string;
};

type CsvImageManifest = {
  assets: ProductAsset[];
  path: string;
};

type VideoSignal = {
  id: string;
  title: string;
  src: string;
};

type RawDesignSignals = {
  fonts: string[];
  colors: string[];
  radii: string[];
  buttonStyles: Array<{ background: string; color: string; borderRadius: string; fontFamily: string }>;
  source: "live-cssom" | "fixture";
};

export async function POST(request: Request) {
  const body = RequestSchema.safeParse(await request.json().catch(() => ({})));
  const url = body.success ? body.data.url : SAMSUNG_DEMO_URL;

  let extraction = fixture as ProductExtraction;

  if (isServerlessDeploy()) {
    extraction = await buildCachedFixtureExtraction(
      url,
      "Serverless deploy: using cached Samsung fixture (Playwright unavailable on Vercel).",
    );
  } else {
    try {
      const scrape = await scrapeSamsungPage(url);
      extraction = await mergeScrapeIntoFixture(scrape, url);
    } catch (error) {
      extraction = await buildCachedFixtureExtraction(
        url,
        `Live scrape failed; cached fixture used. ${error instanceof Error ? error.message : ""}`.trim(),
      );
    }
  }

  if (process.env.OPENAI_API_KEY) {
    extraction = await normalizeWithOpenAI(extraction).catch(() => extraction);
  }

  extraction = await attachDesignSystem(extraction);

  return NextResponse.json(extraction);
}

async function buildCachedFixtureExtraction(url: string, note: string): Promise<ProductExtraction> {
  const base = fixture as ProductExtraction;
  const productHints = getSamsungProductHints(url);
  const csvManifest = await loadCsvImageManifest(productHints);
  const videoAssets = await loadCachedVideoAssets(productHints.cacheNamespace);
  const assets = csvManifest ? [...csvManifest.assets, ...videoAssets] : base.assets;

  return {
    ...base,
    url,
    ...(productHints.sku ? { model: productHints.sku.toUpperCase() } : {}),
    assets,
    extractionMode: "fixture",
    extractedAt: new Date().toISOString(),
    notes: [
      ...base.notes,
      note,
      ...(csvManifest ? [`CSV image manifest loaded from ${csvManifest.path}.`] : []),
      ...(videoAssets.length ? [`Cached video manifest loaded for ${productHints.cacheNamespace}.`] : []),
    ],
  };
}

async function loadCachedVideoAssets(cacheNamespace: string): Promise<ProductAsset[]> {
  const manifestPath = path.join(process.cwd(), "public", "generated", "videos", cacheNamespace, "videos.json");
  if (!(await fileExists(manifestPath))) return [];

  const videos = JSON.parse(await readFile(manifestPath, "utf8")) as Array<{
    id: string;
    title: string;
    cachedSrc?: string;
  }>;

  return videos
    .filter((video) => video.cachedSrc)
    .map((video) => ({
      id: video.id,
      name: `${video.title} video`,
      src: video.cachedSrc!,
      alt: video.title,
      provenance: "verified" as const,
      kind: "video" as const,
      mediaType: "video" as const,
      bgRemoved: false,
    }));
}

async function removeBackgroundForExtractedAssets(assets: ProductAsset[], cacheNamespace: string): Promise<ProductAsset[]> {
  const apiKey = await getRemoveBgApiKey();
  if (!apiKey) return assets.map(normalizeAssetMetadata);

  const outputDir = path.join(process.cwd(), "public", "generated", "removebg", cacheNamespace);
  await mkdir(outputDir, { recursive: true });

  return Promise.all(
    assets.slice(0, 4).map(async (asset, index) => {
      if (!/^https?:\/\//.test(asset.src)) return normalizeAssetMetadata(asset);

      const filename = `asset-${index + 1}.png`;
      const diskPath = path.join(outputDir, filename);
      const publicPath = `/generated/removebg/${cacheNamespace}/${filename}`;

      if (await fileExists(diskPath)) {
        return {
          ...asset,
          name: `${asset.name} (bg removed)`,
          src: publicPath,
          bgRemoved: true,
        };
      }

      const form = new FormData();
      form.set("image_url", asset.src);
      form.set("size", "auto");

      const response = await fetch("https://api.remove.bg/v1.0/removebg", {
        method: "POST",
        headers: { "X-API-Key": apiKey },
        body: form,
      });

      if (!response.ok) return normalizeAssetMetadata(asset);

      const buffer = Buffer.from(await response.arrayBuffer());
      await writeFile(diskPath, buffer);

      return {
        ...asset,
        name: `${asset.name} (bg removed)`,
        src: publicPath,
        bgRemoved: true,
      };
    }),
  );
}

function normalizeAssetMetadata(asset: ProductAsset): ProductAsset {
  const looksBackgroundRemoved =
    asset.bgRemoved === true ||
    asset.src.includes("/generated/removebg/") ||
    asset.name.toLowerCase().includes("bg removed");
  const caption = asset.caption || deterministicAssetCaption(asset);

  return {
    ...asset,
    bgRemoved: looksBackgroundRemoved,
    caption,
    semanticGroup: asset.semanticGroup || semanticGroupFromAsset({ ...asset, caption }),
  };
}

function deterministicAssetCaption(asset: ProductAsset) {
  const haystack = `${asset.id} ${asset.name} ${asset.alt} ${asset.src}`.toLowerCase();
  if (asset.mediaType === "video") return `${asset.name} motion clip`;
  if (haystack.includes("g-sync") || haystack.includes("gsync")) return "NVIDIA G-SYNC gaming visual";
  if (haystack.includes("free-sync") || haystack.includes("freesync")) return "AMD FreeSync gaming visual";
  if (haystack.includes("gaming") || haystack.includes("gamer")) return "gaming performance lifestyle scene";
  if (haystack.includes("soccer")) return "AI soccer mode sports scene";
  if (haystack.includes("dog") || haystack.includes("pet") || haystack.includes("girl")) return "AI upscaling lifestyle scene";
  if (haystack.includes("processor")) return "AI processor chip graphic";
  if (haystack.includes("upscaling")) return "colorful racing car upscaling scene";
  if (haystack.includes("glare")) return "glare-free HDR comparison scene";
  if (haystack.includes("hdr")) return "OLED contrast and brightness TV scene";
  if (haystack.includes("motion") || haystack.includes("xcelerator")) return "fast motion clarity visual";
  if (haystack.includes("port")) return "TV ports and rear detail";
  if (haystack.includes("side")) return "thin TV side profile cutout";
  if (haystack.includes("perspective")) return "angled TV product cutout";
  if (haystack.includes("front")) return "front TV product cutout";
  return asset.alt || asset.name;
}

function semanticGroupFromAsset(asset: Pick<ProductAsset, "caption" | "id" | "kind" | "name" | "alt" | "src">) {
  const caption = `${asset.caption || ""} ${asset.id} ${asset.name} ${asset.alt} ${asset.src}`.toLowerCase();
  if (caption.includes("g-sync") || caption.includes("gsync") || caption.includes("gaming") || caption.includes("gamer")) {
    return "gaming-performance";
  }
  if (caption.includes("free-sync") || caption.includes("freesync")) return "gaming-freesync";
  if (caption.includes("soccer")) return "sports-soccer";
  if (caption.includes("dog") || caption.includes("pet") || caption.includes("girl") || caption.includes("person")) {
    return "ai-upscaling-lifestyle";
  }
  if (caption.includes("processor") || caption.includes("chip")) return "processor-chip";
  if (caption.includes("motion") || caption.includes("xcelerator")) return "motion-clarity";
  if (caption.includes("racing") || caption.includes("car") || caption.includes("upscaling")) return "upscaling-racing";
  if (caption.includes("glare")) return "glare-free-hdr";
  if (caption.includes("hdr") || caption.includes("oled") || caption.includes("brightness") || caption.includes("contrast")) return "oled-picture-quality";
  if (caption.includes("port")) return "product-ports";
  if (caption.includes("side profile") || caption.includes("side")) return "product-side";
  if (caption.includes("perspective") || caption.includes("angled")) return "product-perspective";
  if (caption.includes("front") || caption.includes("product cutout")) return "product-front";
  return `${asset.kind}-${asset.id}`.toLowerCase().replace(/[^a-z0-9]+/g, "-");
}

async function cacheSectionComponentAssets(
  components: SectionComponentSignal[],
  cacheNamespace: string,
): Promise<ProductAsset[]> {
  if (!components.length) return [];

  const outputDir = path.join(process.cwd(), "public", "generated", "sections", cacheNamespace);
  await mkdir(outputDir, { recursive: true });

  const assets: Array<ProductAsset | null> = await Promise.all(
    components.map(async (component, index) => {
      const sourceHash = createHash("sha1").update(component.src).digest("hex").slice(0, 8);
      const baseName = `${String(index + 1).padStart(2, "0")}-${component.id}-${sourceHash}`;
      const fullFilename = `${baseName}-full.jpg`;
      const visualFilename = `${baseName}-visual.jpg`;
      const fullDiskPath = path.join(outputDir, fullFilename);
      const visualDiskPath = path.join(outputDir, visualFilename);
      const visualPublicPath = `/generated/sections/${cacheNamespace}/${visualFilename}`;
      const tileName = component.title.toLowerCase().endsWith("visual")
        ? `${component.title} tile`
        : `${component.title} visual tile`;

      if (!(await fileExists(fullDiskPath))) {
        const response = await fetch(component.src);
        if (response.ok) {
          await writeFile(fullDiskPath, Buffer.from(await response.arrayBuffer()));
        }
      }

      if (!(await fileExists(fullDiskPath))) return null;
      await writeVisualOnlySectionCrop(fullDiskPath, visualDiskPath);
      if (!(await fileExists(visualDiskPath))) return null;

      return {
        id: component.id,
        name: tileName,
        src: visualPublicPath,
        alt: component.alt || component.title,
        provenance: "verified" as const,
        kind: "section" as const,
        bgRemoved: false,
      };
    }),
  );

  await writeFile(
    path.join(outputDir, "section-components.json"),
    JSON.stringify(
      components.map((component, index) => ({
        cachedSrc: `/generated/sections/${cacheNamespace}/${String(index + 1).padStart(2, "0")}-${component.id}-${createHash("sha1")
          .update(component.src)
          .digest("hex")
          .slice(0, 8)}-visual.jpg`,
        sourceFullCardSrc: `/generated/sections/${cacheNamespace}/${String(index + 1).padStart(2, "0")}-${component.id}-${createHash(
          "sha1",
        )
          .update(component.src)
          .digest("hex")
          .slice(0, 8)}-full.jpg`,
        captionRemoved: true,
        ...component,
        editableRecreation: {
          type: "feature-card",
          title: component.title,
          sourceImageRole: "visual",
          textExtraction: component.extraction === "dom-image" ? "dom-label-inference" : "ocr",
        },
      })),
      null,
      2,
    ),
    "utf8",
  );

  return assets.filter((asset): asset is ProductAsset => asset !== null);
}

async function cacheVideoAssets(videos: VideoSignal[], cacheNamespace: string): Promise<ProductAsset[]> {
  if (!videos.length) return [];

  const outputDir = path.join(process.cwd(), "public", "generated", "videos", cacheNamespace);
  await mkdir(outputDir, { recursive: true });

  const assets: Array<ProductAsset | null> = await Promise.all(
    videos.slice(0, 6).map(async (video, index) => {
      const sourceFilename = video.src.split("/").pop()?.split("?")[0] || `${video.id}.mp4`;
      const filename = `${String(index + 1).padStart(2, "0")}-${sourceFilename.replace(/[^a-z0-9.-]/gi, "-")}`;
      const diskPath = path.join(outputDir, filename);
      const publicPath = `/generated/videos/${cacheNamespace}/${filename}`;

      if (!(await fileExists(diskPath))) {
        const response = await fetch(video.src);
        if (response.ok) {
          await writeFile(diskPath, Buffer.from(await response.arrayBuffer()));
        }
      }

      if (!(await fileExists(diskPath))) return null;

      return {
        id: video.id,
        name: `${video.title} video`,
        src: publicPath,
        alt: video.title,
        provenance: "verified" as const,
        kind: "video" as const,
        mediaType: "video" as const,
        bgRemoved: false,
      };
    }),
  );

  await writeFile(
    path.join(outputDir, "videos.json"),
    JSON.stringify(
      videos.slice(0, 6).map((video, index) => ({
        ...video,
        cachedSrc: `/generated/videos/${cacheNamespace}/${String(index + 1).padStart(2, "0")}-${
          video.src.split("/").pop()?.split("?")[0]?.replace(/[^a-z0-9.-]/gi, "-") || `${video.id}.mp4`
        }`,
      })),
      null,
      2,
    ),
    "utf8",
  );

  return assets.filter((asset): asset is ProductAsset => asset !== null);
}

async function writeVisualOnlySectionCrop(fullDiskPath: string, visualDiskPath: string) {
  const image = sharp(fullDiskPath);
  const metadata = await image.metadata();
  if (!metadata.width || !metadata.height) return;

  const visualHeight = Math.max(1, Math.floor(metadata.height * 0.76));
  await image
    .extract({
      left: 0,
      top: 0,
      width: metadata.width,
      height: visualHeight,
    })
    .jpeg({ quality: 92 })
    .toFile(visualDiskPath);
}

async function fileExists(filePath: string) {
  return access(filePath).then(
    () => true,
    () => false,
  );
}

async function loadCsvImageManifest(productHints: SamsungProductHints): Promise<CsvImageManifest | null> {
  const manifestPath = path.join(process.cwd(), "generated", `demo-image-map-${productHints.cacheNamespace}.csv`);
  if (!(await fileExists(manifestPath))) return null;

  const rows = parseCsv(await readFile(manifestPath, "utf8"));
  const assets = rows
    .map((row): ProductAsset | null => {
      const kind = normalizeAssetKind(row.kind);
      const src = row.public_path?.trim();
      if (!kind || !src) return null;

      return normalizeAssetMetadata({
        id: row.asset_id?.trim() || `${kind}-${createHash("sha1").update(src).digest("hex").slice(0, 8)}`,
        name: row.name?.trim() || row.caption?.trim() || row.alt?.trim() || "Demo image asset",
        src,
        alt: row.alt?.trim() || row.caption?.trim() || row.name?.trim() || "Demo image asset",
        provenance: "verified",
        kind,
        bgRemoved: row.bg_removed?.trim().toLowerCase() === "true",
        caption: row.caption?.trim() || undefined,
        semanticGroup: row.semantic_group?.trim() || undefined,
      });
    })
    .filter((asset): asset is ProductAsset => asset !== null);

  return assets.length ? { assets, path: path.relative(process.cwd(), manifestPath) } : null;
}

function normalizeAssetKind(value: string | undefined): ProductAsset["kind"] | null {
  if (value === "hero" || value === "gallery" || value === "section" || value === "generated" || value === "upload") {
    return value;
  }
  return null;
}

function parseCsv(source: string) {
  const rows: string[][] = [];
  let field = "";
  let row: string[] = [];
  let quoted = false;

  for (let index = 0; index < source.length; index += 1) {
    const char = source[index];
    const next = source[index + 1];

    if (quoted) {
      if (char === '"' && next === '"') {
        field += '"';
        index += 1;
      } else if (char === '"') {
        quoted = false;
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"') {
      quoted = true;
    } else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else if (char !== "\r") {
      field += char;
    }
  }

  if (field || row.length) {
    row.push(field);
    rows.push(row);
  }

  const [header, ...body] = rows;
  if (!header) return [];

  return body
    .filter((values) => values.some((value) => value.trim()))
    .map((values) =>
      Object.fromEntries(header.map((key, index) => [key, values[index] || ""])) as Record<string, string>,
    );
}

function getSamsungProductHints(url: string): SamsungProductHints {
  const parsed = new URL(url);
  const slug = parsed.pathname
    .split("/")
    .filter(Boolean)
    .at(-1)
    ?.toLowerCase()
    .replace(/\.html$/, "");
  const sku = slug?.match(/sku-([a-z0-9]+)/i)?.[1]?.toLowerCase();
  const series = slug?.match(/s\d{2}[a-z]?/i)?.[0]?.toLowerCase();
  const cacheNamespace = (sku || series || slug || "samsung-product").replace(/[^a-z0-9-]+/g, "-");
  const tokens = Array.from(new Set([sku, series, slug?.replace(/-/g, ""), slug].filter((token): token is string => Boolean(token))));

  return {
    cacheNamespace,
    sku,
    series,
    tokens,
  };
}

async function scrapeSamsungPage(url: string): Promise<ScrapeResult> {
  const { chromium } = await import("playwright");
  const browser = await chromium.launch({ headless: true });
  const productHints = getSamsungProductHints(url);

  try {
    const page = await browser.newPage({
      userAgent:
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125 Safari/537.36",
    });
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 20000 });
    await page.waitForTimeout(2500);
    for (let y = 0; y < 16000; y += 1400) {
      await page.evaluate((nextY) => window.scrollTo(0, nextY), y);
      await page.waitForTimeout(250);
    }

    return await page.evaluate((hints) => {
      const text = document.body.innerText;
      const title =
        document.querySelector("h1")?.textContent?.trim() ||
        document.title.replace(" | Samsung US", "").trim();
      const prices = Array.from(text.matchAll(/\$[\d,]+\.\d{2}/g), (match) => match[0]);
      const highlightLabels = [
        "NQ4 AI Gen3 Processor",
        "4K AI Upscaling Pro",
        "OLED HDR+",
        "Motion Xcelerator 144Hz",
        "Samsung Vision AI",
      ];
      const highlights = highlightLabels.filter((label) => text.includes(label));
      const normalizeUrl = (value: string) => {
        try {
          return new URL(value.replace(/&amp;/g, "&"), location.href).href;
        } catch {
          return "";
        }
      };
      const srcsetUrls = (value: string | null) =>
        (value || "")
          .split(",")
          .map((entry) => normalizeUrl(entry.trim().split(/\s+/)[0] || ""))
          .filter(Boolean);
      const imageUrlsFromText = (value: string) =>
        Array.from(value.matchAll(/https?:[^"'<>\\\s]+?\.(?:png|jpe?g|webp|avif)(?:\?[^"'<>\\\s]*)?/gi), (match) =>
          normalizeUrl(match[0]),
        ).filter(Boolean);
      const candidates = new Map<
        string,
        { src: string; alt: string; height: number; source: string; width: number }
      >();
      const addCandidate = (src: string, alt: string, width = 0, height = 0, source = "dom") => {
        const normalized = normalizeUrl(src);
        if (!normalized || !/^https?:/.test(normalized)) return;
        const existing = candidates.get(normalized);
        const next = {
          src: normalized,
          alt: alt.trim(),
          width,
          height,
          source,
        };
        if (!existing || next.width * next.height > existing.width * existing.height || next.alt.length > existing.alt.length) {
          candidates.set(normalized, {
            ...next,
            alt: next.alt || existing?.alt || "",
            width: Math.max(next.width, existing?.width || 0),
            height: Math.max(next.height, existing?.height || 0),
          });
        }
      };
      const imageAttributes = [
        "src",
        "currentSrc",
        "data-src",
        "data-desktop-src",
        "data-mobile-src",
        "data-image-src",
        "data-img-src",
        "data-srcset",
        "data-desktop-srcset",
      ];
      Array.from(document.querySelectorAll("img,picture source,[data-src],[data-desktop-src],[data-mobile-src],[data-srcset]")).forEach((node) => {
        const element = node as HTMLImageElement;
        const alt =
          element.alt ||
          element.getAttribute("aria-label") ||
          element.getAttribute("title") ||
          element.closest("section,li,div")?.textContent?.slice(0, 180) ||
          "";
        imageAttributes.forEach((attribute) => {
          const value = attribute === "currentSrc" && "currentSrc" in element ? element.currentSrc : element.getAttribute(attribute);
          if (!value) return;
          if (attribute.toLowerCase().includes("srcset")) {
            srcsetUrls(value).forEach((src) => addCandidate(src, alt, element.naturalWidth, element.naturalHeight, attribute));
            return;
          }
          addCandidate(value, alt, element.naturalWidth, element.naturalHeight, attribute);
        });
        srcsetUrls(element.getAttribute("srcset")).forEach((src) =>
          addCandidate(src, alt, element.naturalWidth, element.naturalHeight, "srcset"),
        );
      });
      Array.from(document.querySelectorAll<HTMLElement>("*"))
        .slice(0, 2000)
        .forEach((node) => {
          const background = window.getComputedStyle(node).backgroundImage;
          if (!background || background === "none") return;
          Array.from(background.matchAll(/url\(["']?([^"')]+)["']?\)/g)).forEach((match) => {
            addCandidate(match[1], node.textContent?.slice(0, 180) || "", node.offsetWidth, node.offsetHeight, "css-background");
          });
        });
      imageUrlsFromText(document.documentElement.innerHTML).forEach((src) => addCandidate(src, "", 0, 0, "html"));

      const images = Array.from(candidates.values()).filter((image) => image.src.includes("images.samsung.com"));
      const isProductGalleryImage = (haystack: string) =>
        [" front ", "front-", "l-perspective", "perspective", "l-side", " side ", "ports", "dimension"].some((token) =>
          haystack.includes(token),
        );
      const isUsableProductAsset = (image: { alt: string; src: string }) => {
        const haystack = `${image.src} ${image.alt}`.toLowerCase();
        if (haystack.includes("thumbnail") || haystack.includes("badge") || haystack.includes("logo")) return false;
        if (haystack.includes("/wmn-") || haystack.includes("wall-mount")) return false;
        if (/product image \d/.test(haystack)) return false;
        return true;
      };
      const productImages = images
        .filter((image) => {
          const haystack = `${image.src} ${image.alt}`.toLowerCase();
          return hints.tokens.some((token) => haystack.includes(token)) && isProductGalleryImage(haystack) && isUsableProductAsset(image);
        })
        .sort((a, b) => b.width * b.height - a.width * a.height)
        .map((image, index) => ({
          src: image.src,
          alt: image.alt,
          role: index === 0 ? "product" : "gallery",
          title: index === 0 ? "Live product image" : `Live gallery image ${index + 1}`,
        }));
      const isRelevantVisual = (image: { alt: string; height: number; src: string; width: number }) => {
        const haystack = `${image.src} ${image.alt}`.toLowerCase();
        return (
          hints.tokens.some((token) => haystack.includes(token)) ||
          [
            "processor",
            "upscaling",
            "glare",
            "hdr",
            "motion",
            "xcelerator",
            "gaming",
            "g-sync",
            "gsync",
            "free-sync",
            "freesync",
            "soccer",
            "lifestyle",
            "dog",
            "girl",
            "gamer",
          ].some((token) => haystack.includes(token))
        );
      };
      const featureSpecs = [
        { id: "section-processor", title: "NQ4 AI Gen3 Processor", keywords: ["processor", "nq4"] },
        { id: "section-upscaling", title: "4K AI Upscaling Pro", keywords: ["upscaling"] },
        { id: "section-hdr", title: "OLED HDR+", keywords: ["hdr"] },
        { id: "section-motion", title: "Motion Xcelerator 144Hz", keywords: ["motion", "xcelerator"] },
        { id: "section-gaming", title: "Ultimate Gaming Pack", keywords: ["gaming", "gamer", "g-sync", "gsync", "free-sync", "freesync"] },
        { id: "section-soccer", title: "AI Soccer Mode Pro", keywords: ["soccer"] },
      ];
      const selectedFeatureSrcs = new Set<string>();
      const sectionComponents = featureSpecs.flatMap((spec) => {
        const image = images.find((candidate) => {
          if (selectedFeatureSrcs.has(candidate.src)) return false;
          const haystack = `${candidate.src} ${candidate.alt}`.toLowerCase();
          return (
            spec.keywords.some((keyword) => haystack.includes(keyword)) &&
            (hints.tokens.some((token) => haystack.includes(token)) || candidate.src.includes("/feature/")) &&
            (candidate.width >= 500 || candidate.height >= 300 || candidate.source === "html")
          );
        });

        if (!image) return [];
        selectedFeatureSrcs.add(image.src);

        return [
          {
            id: spec.id,
            title: spec.title,
            src: image.src,
            alt: image.alt || spec.title,
            extraction: "dom-image" as const,
          },
        ];
      });
      const usedSectionSrcs = new Set(sectionComponents.map((component) => component.src));
      const titleForVisual = (image: { alt: string; src: string }) => {
        const haystack = `${image.src} ${image.alt}`.toLowerCase();
        if (haystack.includes("g-sync") || haystack.includes("gsync")) return "NVIDIA G-SYNC gaming";
        if (haystack.includes("free-sync") || haystack.includes("freesync")) return "AMD FreeSync gaming";
        if (haystack.includes("gaming") || haystack.includes("gamer")) return "Ultimate Gaming Pack";
        if (haystack.includes("soccer")) return "AI Soccer Mode Pro";
        if (haystack.includes("dog") || haystack.includes("girl") || haystack.includes("pet")) return "AI upscaling lifestyle";
        if (haystack.includes("lifestyle")) return "Lifestyle TV";
        return image.alt?.slice(0, 80) || "Samsung feature visual";
      };
      const extraSectionComponents = images
        .filter((image) => {
          if (usedSectionSrcs.has(image.src)) return false;
          if (!isUsableProductAsset(image)) return false;
          const haystack = `${image.src} ${image.alt}`.toLowerCase();
          if (isProductGalleryImage(haystack)) return false;
          return isRelevantVisual(image) && (image.width >= 500 || image.height >= 300 || image.source === "html");
        })
        .sort((a, b) => b.width * b.height - a.width * a.height)
        .slice(0, 12)
        .map((image, index) => ({
          id: `section-extra-${index + 1}`,
          title: titleForVisual(image),
          src: image.src,
          alt: image.alt || titleForVisual(image),
          extraction: "dom-image" as const,
        }));
      const videoUrls = new Set<string>();
      const videoAttributes = [
        "src",
        "data-src",
        "data-video-src",
        "data-desktop-src",
        "data-mobile-src",
        "data-media",
        "data-video",
      ];
      Array.from(
        document.querySelectorAll("video, source, [data-src], [data-video-src], [data-desktop-src], [data-mobile-src]"),
      ).forEach((node) => {
        videoAttributes.forEach((attribute) => {
          const value = node.getAttribute(attribute);
          if (value?.includes(".mp4")) videoUrls.add(new URL(value, location.href).href);
        });
        if ("currentSrc" in node && typeof node.currentSrc === "string" && node.currentSrc.includes(".mp4")) {
          videoUrls.add(node.currentSrc);
        }
      });
      Array.from(document.documentElement.innerHTML.matchAll(/https?:[^"'<>\\]+?\.mp4(?:\?[^"'<>\\]*)?/g)).forEach(
        (match) => videoUrls.add(match[0].replace(/&amp;/g, "&")),
      );
      const videos = Array.from(videoUrls)
        .filter((videoUrl) => videoUrl.includes("images.samsung.com") && videoUrl.includes(".mp4"))
        .map((videoUrl) => {
          const file = videoUrl.split("/").pop()?.split("?")[0] || "feature-video.mp4";
          const title = file
            .replace(/^us-feature-/, "")
            .replace(/-\d+\.mp4$/, "")
            .replace(/\.mp4$/, "")
            .replace(/--nbsp--|nbsp/g, "feature motion")
            .split("-")
            .filter(Boolean)
            .map((part) => `${part[0]?.toUpperCase() || ""}${part.slice(1)}`)
            .join(" ");
          return {
            id: `video-${file.replace(/\.mp4$/, "").replace(/[^a-z0-9]+/gi, "-").toLowerCase()}`,
            title: title || "Samsung feature video",
            src: videoUrl,
          };
        });
      const sampled = [
        document.body,
        ...Array.from(document.querySelectorAll("h1,h2,h3,p,a,button,[role='button'],.highlight,.pd-info")),
      ].filter(Boolean);
      const colors = new Set<string>();
      const fonts = new Set<string>();
      const radii = new Set<string>();

      sampled.slice(0, 120).forEach((node) => {
        const style = window.getComputedStyle(node as Element);
        [
          style.color,
          style.backgroundColor,
          style.borderColor,
          style.fill,
          style.outlineColor,
        ].forEach((value) => {
          if (value && value !== "rgba(0, 0, 0, 0)" && value !== "transparent") colors.add(value);
        });
        if (style.fontFamily) fonts.add(style.fontFamily);
        if (style.borderRadius && style.borderRadius !== "0px") radii.add(style.borderRadius);
      });

      const rootStyle = window.getComputedStyle(document.documentElement);
      Array.from(document.styleSheets).slice(0, 12).forEach((sheet) => {
        try {
          Array.from(sheet.cssRules || []).forEach((rule) => {
            const cssText = rule.cssText || "";
            Array.from(cssText.matchAll(/#[0-9a-fA-F]{3,8}|rgba?\([^)]+\)|oklch\([^)]+\)/g))
              .slice(0, 20)
              .forEach((match) => colors.add(match[0]));
          });
        } catch {
          // Cross-origin stylesheets cannot be inspected; computed styles above are the fallback.
        }
      });
      for (let i = 0; i < rootStyle.length; i += 1) {
        const name = rootStyle[i];
        if (!name.startsWith("--")) continue;
        const value = rootStyle.getPropertyValue(name).trim();
        if (/#[0-9a-fA-F]{3,8}|rgba?\(|oklch\(/.test(value)) colors.add(value);
      }
      const buttonStyles = Array.from(document.querySelectorAll("button,a[role='button'],.cta"))
        .slice(0, 8)
        .map((node) => {
          const style = window.getComputedStyle(node as Element);
          return {
            background: style.backgroundColor,
            color: style.color,
            borderRadius: style.borderRadius,
            fontFamily: style.fontFamily,
          };
        });

      return {
        title,
        price: prices[0],
        previousPrice: prices.find((price) => price !== prices[0]),
        highlights,
        images: productImages.slice(0, 6),
        sectionComponents: [...sectionComponents, ...extraSectionComponents],
        videos: videos.slice(0, 6),
        design: {
          fonts: Array.from(fonts).slice(0, 12),
          colors: Array.from(colors).slice(0, 40),
          radii: Array.from(radii).slice(0, 12),
          buttonStyles,
          source: "live-cssom" as const,
        },
      };
    }, productHints);
  } finally {
    await browser.close();
  }
}

async function mergeScrapeIntoFixture(scrape: ScrapeResult, url: string): Promise<ProductExtraction> {
  const base = fixture as ProductExtraction;
  const productHints = getSamsungProductHints(url);
  const csvManifest = await loadCsvImageManifest(productHints);
  const imageAssets = csvManifest?.assets || (await buildLiveImageAssets(scrape, productHints, base));
  const videoAssets = await cacheVideoAssets(scrape.videos, productHints.cacheNamespace);
  const assets = await captionAssetsWithOpenAI([...imageAssets, ...videoAssets].map(normalizeAssetMetadata));
  const model = productHints.sku?.toUpperCase() || base.model;

  return {
    ...base,
    url,
    name: scrape.title || base.name,
    model,
    price: scrape.price || base.price,
    previousPrice: scrape.previousPrice || base.previousPrice,
    facts: mergeLiveFacts(base, {
      model,
      price: scrape.price,
      previousPrice: scrape.previousPrice,
      title: scrape.title,
      highlights: scrape.highlights,
    }),
    assets,
    designSystem: buildDesignSystem({
      productName: scrape.title || base.name,
      sourceUrl: url,
      signals: scrape.design,
      generatedAt: new Date().toISOString(),
    }),
    extractionMode: "live",
    extractedAt: new Date().toISOString(),
    notes: [
      "Live Playwright scrape completed.",
      csvManifest ? `CSV image manifest loaded from ${csvManifest.path}.` : "CSV image manifest missing; live image extraction used.",
      "OpenAI normalization is skipped unless OPENAI_API_KEY is set.",
    ],
  };
}

async function buildLiveImageAssets(
  scrape: ScrapeResult,
  productHints: SamsungProductHints,
  base: ProductExtraction,
): Promise<ProductAsset[]> {
  const liveAssets =
    scrape.images.length > 0
      ? scrape.images.slice(0, 4).map((image, index) => ({
          id: `asset-live-${index + 1}`,
          name: image.title,
          src: image.src,
          alt: image.alt || `${scrape.title} image ${index + 1}`,
          provenance: "verified" as const,
          kind: index === 0 ? ("hero" as const) : ("gallery" as const),
          bgRemoved: false,
          caption: image.alt || image.title,
          semanticGroup: `product-${image.role}-${index + 1}`,
        }))
      : base.assets;
  const bgRemovedAssets = (await removeBackgroundForExtractedAssets(liveAssets, productHints.cacheNamespace)).map(normalizeAssetMetadata);
  const sectionAssets = await cacheSectionComponentAssets(scrape.sectionComponents, productHints.cacheNamespace);

  return [...bgRemovedAssets, ...sectionAssets];
}

function mergeLiveFacts(
  base: ProductExtraction,
  live: {
    highlights: string[];
    model: string;
    previousPrice?: string;
    price?: string;
    title: string;
  },
) {
  const highlightByLabel = (label: string) => live.highlights.find((highlight) => highlight.toLowerCase().includes(label));
  return base.facts.map((fact) => {
    if (fact.id === "fact-model") return { ...fact, value: live.model };
    if (fact.id === "fact-price" && live.price) return { ...fact, value: live.price };
    if (fact.id === "fact-previous-price" && live.previousPrice) return { ...fact, value: live.previousPrice };
    if (fact.id === "fact-smart-platform") return { ...fact, value: live.title.includes("Samsung Vision AI") ? "Samsung Vision AI Smart TV" : fact.value };
    if (fact.id === "fact-processor") return { ...fact, value: highlightByLabel("processor") || fact.value };
    if (fact.id === "fact-upscaling") return { ...fact, value: highlightByLabel("upscaling") || fact.value };
    if (fact.id === "fact-hdr") return { ...fact, value: highlightByLabel("hdr") || fact.value };
    if (fact.id === "fact-motion") return { ...fact, value: highlightByLabel("motion") || fact.value };
    return fact;
  });
}

async function attachDesignSystem(extraction: ProductExtraction): Promise<ProductExtraction> {
  const designSystem =
    extraction.designSystem ||
    buildDesignSystem({
      productName: extraction.name,
      sourceUrl: extraction.url,
      generatedAt: new Date().toISOString(),
      signals: {
        fonts: ["SamsungOne, Arial, Helvetica, sans-serif", "SamsungSharpSans, Arial, sans-serif"],
        colors: ["#000000", "#ffffff", "#1428a0", "#f7f7f7", "#1f2937", "#6b7280"],
        radii: ["9999px", "24px", "12px"],
        buttonStyles: [
          {
            background: "rgb(0, 0, 0)",
            color: "rgb(255, 255, 255)",
            borderRadius: "9999px",
            fontFamily: "SamsungOne, Arial, sans-serif",
          },
        ],
        source: "fixture",
      },
    });

  await writeDesignSystemFiles(designSystem, extraction);
  return {
    ...extraction,
    designSystem,
    notes: Array.from(new Set([...extraction.notes, `Design system saved to ${designSystem.designMdPath}.`])),
  };
}

function buildDesignSystem({
  generatedAt,
  productName,
  signals,
  sourceUrl,
}: {
  generatedAt: string;
  productName: string;
  signals: RawDesignSignals;
  sourceUrl: string;
}): ProductDesignSystem {
  const colors = normalizeColors(signals.colors);
  const fonts = signals.fonts.length ? signals.fonts : ["Arial, Helvetica, sans-serif"];
  const radii = signals.radii.length ? signals.radii : ["24px", "9999px", "12px"];
  const dark = colors.find(isDarkColor) || "#000000";
  const light = colors.find(isLightColor) || "#ffffff";
  const accent = pickAccent(colors, dark, light);

  return {
    name: `Design — ${productName}`,
    sourceUrl,
    generatedAt,
    confidence: signals.source === "live-cssom" && signals.colors.length > 8 ? "high" : "medium",
    designMdPath: "generated/design.md",
    tokensSourcePath: "generated/tokens.source.json",
    tokens: {
      paper: light,
      paper2: colors.find((color) => color !== light && isLightColor(color)) || "#f7f7f7",
      ink: dark,
      ink2: colors.find((color) => color !== dark && isDarkColor(color)) || "#1f2937",
      rule: colors.find((color) => !isDarkColor(color) && !isLightColor(color)) || "#d1d5db",
      accent,
      accentInk: isDarkColor(accent) ? "#ffffff" : "#000000",
      focus: accent,
      fontDisplay: fonts[0],
      fontBody: fonts[1] || fonts[0],
      fontMono: '"SFMono-Regular", "JetBrains Mono", monospace',
      radiusCard: radii.find((radius) => radius !== "9999px") || "24px",
      radiusPill: radii.find((radius) => radius === "9999px") || "9999px",
      radiusInput: radii[radii.length - 1] || "12px",
    },
    evidence: {
      fonts,
      colors,
      radii,
      source: signals.source,
    },
  };
}

async function writeDesignSystemFiles(
  designSystem: ProductDesignSystem,
  extraction: ProductExtraction,
) {
  if (isServerlessDeploy()) return;

  const outputDir = path.join(process.cwd(), "generated");
  await mkdir(outputDir, { recursive: true });
  await Promise.all([
    writeFile(path.join(outputDir, "design.md"), renderDesignMd(designSystem, extraction), "utf8"),
    writeFile(
      path.join(outputDir, "tokens.source.json"),
      JSON.stringify(
        {
          sourceUrl: designSystem.sourceUrl,
          generatedAt: designSystem.generatedAt,
          confidence: designSystem.confidence,
          tokens: designSystem.tokens,
          evidence: designSystem.evidence,
        },
        null,
        2,
      ),
      "utf8",
    ),
  ]);
}

function renderDesignMd(designSystem: ProductDesignSystem, extraction: ProductExtraction) {
  const { tokens } = designSystem;

  return `# ${designSystem.name}

Locked product-page design system. Future AdFrame generations should read this file first and preserve the source page's brand DNA unless the user intentionally changes it.

## Provenance
- Source · ${designSystem.sourceUrl}
- Product · ${extraction.name}
- Generated · ${designSystem.generatedAt}
- Confidence · ${designSystem.confidence}
- Evidence · ${designSystem.evidence.source}

## System
- Genre · premium ecommerce PDP
- Macrostructure · product-page-to-social-infographic
- Theme · source-derived (fonts, palette, radius, CTA rhythm)
- Guardrail · preserve verified product claims separately from inferred marketing copy

## Tokens
\`\`\`css
:root {
  --color-paper: ${tokens.paper};
  --color-paper-2: ${tokens.paper2};
  --color-ink: ${tokens.ink};
  --color-ink-2: ${tokens.ink2};
  --color-rule: ${tokens.rule};
  --color-accent: ${tokens.accent};
  --color-accent-ink: ${tokens.accentInk};
  --color-focus: ${tokens.focus};

  --font-display: ${tokens.fontDisplay};
  --font-body: ${tokens.fontBody};
  --font-mono: ${tokens.fontMono};

  --radius-card: ${tokens.radiusCard};
  --radius-pill: ${tokens.radiusPill};
  --radius-input: ${tokens.radiusInput};
}
\`\`\`

## Typography
- Display · ${tokens.fontDisplay}
- Body · ${tokens.fontBody}
- Mono · ${tokens.fontMono}

## CTA Voice
- Primary · ${tokens.accent} on ${tokens.accentInk} · ${tokens.radiusPill}
- Secondary · outline / ghost · preserve source page radius and spacing

## Notes
- Keep AdFrame's liquid-glass editability, but use the source page accent and font stack in generated cards.
- Do not invent specs. Only promote claims present in the PDP or explicitly approved by the user.
- Source colors scanned: ${designSystem.evidence.colors.slice(0, 12).join(", ")}
`;
}

function normalizeColors(colors: string[]) {
  return Array.from(new Set(colors.map((color) => color.trim()).filter(Boolean))).slice(0, 24);
}

function isDarkColor(color: string) {
  const rgb = parseRgb(color);
  if (!rgb) return color === "#000000" || color.toLowerCase() === "black";
  return rgb[0] * 0.299 + rgb[1] * 0.587 + rgb[2] * 0.114 < 80;
}

function isLightColor(color: string) {
  const rgb = parseRgb(color);
  if (!rgb) return color === "#ffffff" || color.toLowerCase() === "white";
  return rgb[0] * 0.299 + rgb[1] * 0.587 + rgb[2] * 0.114 > 220;
}

function pickAccent(colors: string[], dark: string, light: string) {
  return colors.find((color) => color !== dark && color !== light && !isDarkColor(color) && !isLightColor(color)) || "#1428a0";
}

function parseRgb(color: string): [number, number, number] | null {
  const rgb = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/i);
  if (rgb) return [Number(rgb[1]), Number(rgb[2]), Number(rgb[3])];
  const hex = color.match(/^#([0-9a-f]{6})$/i);
  if (!hex) return null;
  const raw = hex[1];
  return [Number.parseInt(raw.slice(0, 2), 16), Number.parseInt(raw.slice(2, 4), 16), Number.parseInt(raw.slice(4, 6), 16)];
}

const AssetCaptionsSchema = z.object({
  assets: z.array(
    z.object({
      id: z.string(),
      caption: z.string(),
      semanticGroup: z.string(),
    }),
  ),
});

async function captionAssetsWithOpenAI(assets: ProductAsset[]): Promise<ProductAsset[]> {
  if (!process.env.OPENAI_API_KEY || assets.length === 0) return assets;

  try {
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const response = await client.responses.create({
      model: "gpt-5.4-mini-2026-03-17",
      input: [
        {
          role: "system",
          content:
            "Caption product-page image assets for layout diversity. Return concise visible-scene captions and stable semanticGroup keys. Similar or duplicate-looking images must share the same semanticGroup. Do not invent product claims.",
        },
        {
          role: "user",
          content: JSON.stringify({
            assets: assets.map(({ id, name, alt, src, kind, mediaType, bgRemoved, caption, semanticGroup }) => ({
              id,
              name,
              alt,
              src,
              kind,
              mediaType,
              bgRemoved,
              currentCaption: caption,
              currentSemanticGroup: semanticGroup,
            })),
          }),
        },
      ],
      text: {
        format: {
          type: "json_schema",
          name: "asset_captions",
          schema: {
            type: "object",
            additionalProperties: false,
            required: ["assets"],
            properties: {
              assets: {
                type: "array",
                items: {
                  type: "object",
                  additionalProperties: false,
                  required: ["id", "caption", "semanticGroup"],
                  properties: {
                    id: { type: "string" },
                    caption: { type: "string" },
                    semanticGroup: { type: "string" },
                  },
                },
              },
            },
          },
        },
      },
    });
    const parsed = AssetCaptionsSchema.safeParse(JSON.parse(response.output_text));
    if (!parsed.success) return assets;
    const byId = new Map(parsed.data.assets.map((asset) => [asset.id, asset]));
    return assets.map((asset) => {
      const captioned = byId.get(asset.id);
      if (!captioned) return asset;
      return {
        ...asset,
        caption: captioned.caption,
        semanticGroup: captioned.semanticGroup.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
      };
    });
  } catch {
    return assets;
  }
}

async function normalizeWithOpenAI(extraction: ProductExtraction): Promise<ProductExtraction> {
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const response = await client.responses.create({
    model: "gpt-5.4-mini-2026-03-17",
    input: [
      {
        role: "system",
        content:
          "You normalize verified ecommerce facts into concise, claim-safe Apple-style infographic copy. Do not invent product claims.",
      },
      {
        role: "user",
        content: JSON.stringify({
          name: extraction.name,
          facts: extraction.facts,
          currentFeatures: extraction.features,
        }),
      },
    ],
    text: {
      format: {
        type: "json_schema",
        name: "normalized_product_copy",
        schema: {
          type: "object",
          additionalProperties: false,
          required: ["headline", "subtitle", "features"],
          properties: {
            headline: { type: "string" },
            subtitle: { type: "string" },
            features: {
              type: "array",
              minItems: 3,
              maxItems: 5,
              items: {
                type: "object",
                additionalProperties: false,
                required: ["title", "body"],
                properties: {
                  title: { type: "string" },
                  body: { type: "string" },
                },
              },
            },
          },
        },
      },
    },
  });

  const parsed = NormalizedSchema.safeParse(JSON.parse(response.output_text));
  if (!parsed.success) return extraction;

  const features: ProductFeature[] = parsed.data.features.map((feature, index) => ({
    id: extraction.features[index]?.id || `feature-openai-${index + 1}`,
    title: feature.title,
    body: feature.body,
    provenance: "inferred",
    sourceFactIds: extraction.features[index]?.sourceFactIds || ["fact-model"],
  }));

  return {
    ...extraction,
    headline: parsed.data.headline,
    subtitle: parsed.data.subtitle,
    features,
    notes: [...extraction.notes, "OpenAI normalized the headline and feature copy."],
  };
}
