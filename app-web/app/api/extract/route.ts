import { NextResponse } from "next/server";
import { access, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import OpenAI from "openai";
import { chromium } from "playwright";
import sharp from "sharp";
import { z } from "zod";
import fixture from "@/fixtures/samsung-s90f.json";
import { getRemoveBgApiKey } from "@/lib/server-env";
import type { ProductAsset, ProductDesignSystem, ProductExtraction, ProductFeature } from "@/lib/types";
import { SAMSUNG_DEMO_URL } from "@/lib/types";

export const runtime = "nodejs";

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
  images: string[];
  sectionComponents: SectionComponentSignal[];
  videos: VideoSignal[];
  design: RawDesignSignals;
};

type SectionComponentSignal = {
  id: string;
  title: string;
  src: string;
  alt: string;
  extraction: "dom-image" | "section-crop" | "ocr-recreation";
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

  try {
    const scrape = await scrapeSamsungPage(url);
    extraction = await mergeScrapeIntoFixture(scrape, url);
  } catch (error) {
    extraction = {
      ...(fixture as ProductExtraction),
      url,
      extractionMode: "fixture",
      extractedAt: new Date().toISOString(),
      notes: [
        ...(fixture as ProductExtraction).notes,
        `Live scrape failed; cached fixture used. ${error instanceof Error ? error.message : ""}`.trim(),
      ],
    };
  }

  if (process.env.OPENAI_API_KEY) {
    extraction = await normalizeWithOpenAI(extraction).catch(() => extraction);
  }

  extraction = await attachDesignSystem(extraction);

  return NextResponse.json(extraction);
}

async function removeBackgroundForExtractedAssets(assets: ProductAsset[]): Promise<ProductAsset[]> {
  const apiKey = await getRemoveBgApiKey();
  if (!apiKey) return assets.map(normalizeAssetBackgroundFlag);

  const outputDir = path.join(process.cwd(), "public", "generated", "removebg", "samsung-s90f");
  await mkdir(outputDir, { recursive: true });

  return Promise.all(
    assets.slice(0, 4).map(async (asset, index) => {
      if (!/^https?:\/\//.test(asset.src)) return normalizeAssetBackgroundFlag(asset);

      const filename = `asset-${index + 1}.png`;
      const diskPath = path.join(outputDir, filename);
      const publicPath = `/generated/removebg/samsung-s90f/${filename}`;

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

      if (!response.ok) return normalizeAssetBackgroundFlag(asset);

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

function normalizeAssetBackgroundFlag(asset: ProductAsset): ProductAsset {
  const looksBackgroundRemoved =
    asset.bgRemoved === true ||
    asset.src.includes("/generated/removebg/") ||
    asset.name.toLowerCase().includes("bg removed");

  return {
    ...asset,
    bgRemoved: looksBackgroundRemoved,
  };
}

async function cacheSectionComponentAssets(components: SectionComponentSignal[]): Promise<ProductAsset[]> {
  if (!components.length) return [];

  const outputDir = path.join(process.cwd(), "public", "generated", "sections", "samsung-s90f");
  await mkdir(outputDir, { recursive: true });

  const assets: Array<ProductAsset | null> = await Promise.all(
    components.map(async (component, index) => {
      const baseName = `${String(index + 1).padStart(2, "0")}-${component.id}`;
      const fullFilename = `${baseName}-full.jpg`;
      const visualFilename = `${baseName}-visual.jpg`;
      const fullDiskPath = path.join(outputDir, fullFilename);
      const visualDiskPath = path.join(outputDir, visualFilename);
      const visualPublicPath = `/generated/sections/samsung-s90f/${visualFilename}`;

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
        name: `${component.title} visual tile`,
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
        captionRemoved: true,
        ...component,
        cachedSrc: `/generated/sections/samsung-s90f/${String(index + 1).padStart(2, "0")}-${component.id}-visual.jpg`,
        sourceFullCardSrc: `/generated/sections/samsung-s90f/${String(index + 1).padStart(2, "0")}-${component.id}-full.jpg`,
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

async function cacheVideoAssets(videos: VideoSignal[]): Promise<ProductAsset[]> {
  if (!videos.length) return [];

  const outputDir = path.join(process.cwd(), "public", "generated", "videos", "samsung-s90f");
  await mkdir(outputDir, { recursive: true });

  const assets: Array<ProductAsset | null> = await Promise.all(
    videos.slice(0, 6).map(async (video, index) => {
      const sourceFilename = video.src.split("/").pop()?.split("?")[0] || `${video.id}.mp4`;
      const filename = `${String(index + 1).padStart(2, "0")}-${sourceFilename.replace(/[^a-z0-9.-]/gi, "-")}`;
      const diskPath = path.join(outputDir, filename);
      const publicPath = `/generated/videos/samsung-s90f/${filename}`;

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
        cachedSrc: `/generated/videos/samsung-s90f/${String(index + 1).padStart(2, "0")}-${
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

async function scrapeSamsungPage(url: string): Promise<ScrapeResult> {
  const browser = await chromium.launch({ headless: true });

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

    return await page.evaluate(() => {
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
      const images = Array.from(document.images)
        .map((image) => ({
          src: image.currentSrc || image.src,
          alt: image.alt || "",
          width: image.naturalWidth,
          height: image.naturalHeight,
        }))
        .filter((image) => image.src && /^https?:/.test(image.src));
      const productImages = images
        .filter((image) => {
          const haystack = `${image.src} ${image.alt}`.toLowerCase();
          return haystack.includes("qn77s90fafxza") || haystack.includes("oled-s90f") || haystack.includes("s90f");
        })
        .sort((a, b) => b.width * b.height - a.width * a.height)
        .map((image) => image.src);
      const featureSpecs = [
        { id: "section-processor", title: "NQ4 AI Gen3 Processor", keywords: ["processor", "nq4"] },
        { id: "section-upscaling", title: "4K AI Upscaling Pro", keywords: ["upscaling"] },
        { id: "section-hdr", title: "OLED HDR+", keywords: ["hdr"] },
        { id: "section-motion", title: "Motion Xcelerator 144Hz", keywords: ["motion", "xcelerator"] },
      ];
      const sectionComponents = featureSpecs.flatMap((spec) => {
        const image = images.find((candidate) => {
          const haystack = `${candidate.src} ${candidate.alt}`.toLowerCase();
          return (
            haystack.includes("qn77s90fafxza") &&
            spec.keywords.some((keyword) => haystack.includes(keyword)) &&
            candidate.width >= 1000
          );
        });

        if (!image) return [];

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
        images: Array.from(new Set(productImages)).slice(0, 6),
        sectionComponents,
        videos: videos.slice(0, 6),
        design: {
          fonts: Array.from(fonts).slice(0, 12),
          colors: Array.from(colors).slice(0, 40),
          radii: Array.from(radii).slice(0, 12),
          buttonStyles,
          source: "live-cssom" as const,
        },
      };
    });
  } finally {
    await browser.close();
  }
}

async function mergeScrapeIntoFixture(scrape: ScrapeResult, url: string): Promise<ProductExtraction> {
  const base = fixture as ProductExtraction;
  const liveAssets =
    scrape.images.length > 0
      ? scrape.images.slice(0, 4).map((src, index) => ({
          id: `asset-live-${index + 1}`,
          name: index === 0 ? "Live product image" : `Live gallery image ${index + 1}`,
          src,
          alt: `${scrape.title} image ${index + 1}`,
          provenance: "verified" as const,
          kind: index === 0 ? ("hero" as const) : ("gallery" as const),
          bgRemoved: false,
        }))
      : base.assets;
  const bgRemovedAssets = (await removeBackgroundForExtractedAssets(liveAssets)).map(normalizeAssetBackgroundFlag);
  const sectionAssets = await cacheSectionComponentAssets(scrape.sectionComponents);
  const videoAssets = await cacheVideoAssets(scrape.videos);

  return {
    ...base,
    url,
    name: scrape.title || base.name,
    price: scrape.price || base.price,
    previousPrice: scrape.previousPrice || base.previousPrice,
    assets: [...bgRemovedAssets, ...sectionAssets, ...videoAssets],
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
      "OpenAI normalization is skipped unless OPENAI_API_KEY is set.",
    ],
  };
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
