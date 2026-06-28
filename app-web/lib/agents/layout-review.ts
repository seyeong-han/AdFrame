import { Agent, run, tool } from "@openai/agents";
import { z } from "zod";

const DESIGN_SUMMARY = `
AdFrame DESIGN.md summary:
- Cinema mosaic: dark editorial canvas, product story, strong hero, bottom feature mosaic.
- Apple infographic: light rounded tile board, centered hero, compact labels/metrics, sparse orange accent, visually filled canvas.
- All presets: avoid overflow outside frame, avoid severe overlap, keep readable text, keep product imagery important, never place videos as static images.
`;
const LAYOUT_REVIEW_MODEL = "gpt-5.4-mini-2026-03-17";

export const ReviewShapeSchema = z.object({
  id: z.string(),
  type: z.string(),
  parentId: z.string().optional(),
  x: z.number(),
  y: z.number(),
  props: z.record(z.string(), z.unknown()),
});

export const ReviewAssetSchema = z.object({
  id: z.string(),
  name: z.string(),
  src: z.string(),
  alt: z.string(),
  kind: z.string(),
  mediaType: z.string().optional(),
  bgRemoved: z.boolean().optional(),
  caption: z.string().optional(),
  semanticGroup: z.string().optional(),
});

export const LayoutReviewRequestSchema = z.object({
  imageDataUrl: z.string().optional(),
  positionPreset: z.enum(["cinema-mosaic", "apple-infographic"]),
  exportPreset: z.object({
    id: z.string(),
    width: z.number(),
    height: z.number(),
    label: z.string().optional(),
  }),
  frame: z.object({
    id: z.string(),
    width: z.number(),
    height: z.number(),
  }),
  shapes: z.array(ReviewShapeSchema),
  assets: z.array(ReviewAssetSchema),
  features: z.array(
    z.object({
      id: z.string(),
      title: z.string(),
      body: z.string(),
    }),
  ),
});

export const LayoutFindingSchema = z.object({
  severity: z.enum(["info", "warning", "error"]),
  category: z.enum(["overflow", "overlap", "coverage", "asset", "typography", "design"]),
  shapeIds: z.array(z.string()),
  message: z.string(),
});

export const LayoutPatchSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("moveResize"),
    shapeId: z.string(),
    x: z.number(),
    y: z.number(),
    w: z.number().optional(),
    h: z.number().optional(),
  }),
  z.object({
    type: z.literal("swapAsset"),
    shapeId: z.string(),
    assetId: z.string(),
    src: z.string(),
    alt: z.string(),
    fit: z.enum(["contain", "cover"]),
  }),
  z.object({
    type: z.literal("updateProps"),
    shapeId: z.string(),
    props: z.record(z.string(), z.unknown()),
  }),
  z.object({
    type: z.literal("bringToFront"),
    shapeIds: z.array(z.string()),
  }),
]);

export const LayoutReviewResultSchema = z.object({
  score: z.number().min(0).max(100),
  summary: z.string(),
  findings: z.array(LayoutFindingSchema),
  patches: z.array(LayoutPatchSchema),
  source: z.enum(["agents", "deterministic"]),
});

export type LayoutReviewRequest = z.infer<typeof LayoutReviewRequestSchema>;
export type LayoutReviewResult = z.infer<typeof LayoutReviewResultSchema>;
export type LayoutPatch = z.infer<typeof LayoutPatchSchema>;

type Bounds = {
  id: string;
  type: string;
  x: number;
  y: number;
  w: number;
  h: number;
};

type AppleBoardMetrics = {
  gridOccupancyRatio: number;
  heroAdjacencyCount: number;
  missingZones: string[];
  nonHeroCoverageRatio: number;
  tileCount: number;
};

export async function reviewLayoutWithAgents(input: LayoutReviewRequest): Promise<LayoutReviewResult> {
  const deterministic = deterministicReview(input);
  if (!process.env.OPENAI_API_KEY) return deterministic;

  try {
    const measureLayoutTool = tool({
      name: "measure_layout",
      description: "Measure overflow, overlap, hero centering, safe margins, and tile coverage for the current frame.",
      parameters: z.object({}),
      execute: async () => measureLayout(input),
    });

    const rankAssetsTool = tool({
      name: "rank_assets_for_slot",
      description: "Rank available assets for a layout slot using metadata and feature keywords.",
      parameters: z.object({
        slot: z.enum(["hero", "feature", "detail"]),
        featureTitle: z.string().optional(),
        currentAssetId: z.string().optional(),
      }),
      execute: async ({ slot, featureTitle, currentAssetId }) =>
        rankAssetsForSlot(input.assets, slot, featureTitle, currentAssetId).slice(0, 5),
    });

    const proposeGridReflowTool = tool({
      name: "propose_grid_reflow",
      description: "Return conservative safe patches for severe deterministic layout problems.",
      parameters: z.object({}),
      execute: async () => deterministic.patches,
    });

    const imageUnderstandingAgent = new Agent({
      name: "Image Understanding Agent",
      instructions:
        "Evaluate whether the screenshot has a prominent product hero, meaningful image tiles, readable copy, and good visual hierarchy.",
      model: LAYOUT_REVIEW_MODEL,
    });

    const layoutGeometryAgent = new Agent({
      name: "Layout Geometry Agent",
      instructions:
        "Evaluate deterministic geometry: overflow, severe overlaps, center alignment, tile coverage, and safe margins. Prefer tool measurements.",
      tools: [measureLayoutTool, proposeGridReflowTool],
      model: LAYOUT_REVIEW_MODEL,
    });

    const designComplianceAgent = new Agent({
      name: "Design Compliance Agent",
      instructions: `Evaluate against this design brief and preset semantics. ${DESIGN_SUMMARY}`,
      tools: [rankAssetsTool],
      model: LAYOUT_REVIEW_MODEL,
    });

    const orchestrator = new Agent({
      name: "Layout Review Orchestrator",
      instructions: `
You review AdFrame canvas layouts. Use specialist context:
- Image Understanding: product prominence, image quality, readability.
- Layout Geometry: overflow, overlap, center alignment, coverage.
- Design Compliance: DESIGN.md and selected preset semantics.

Return ONLY strict JSON with fields:
score, summary, findings, patches.
Patches must be safe and conservative. If uncertain, report findings without patches.
Allowed patch types: moveResize, swapAsset, updateProps, bringToFront.
Never suggest video assets as static images.
${DESIGN_SUMMARY}
`,
      tools: [measureLayoutTool, rankAssetsTool, proposeGridReflowTool],
      model: LAYOUT_REVIEW_MODEL,
    });

    const specialistPrompt = `Review this AdFrame layout from your specialty and return a concise JSON-ish summary:\n${JSON.stringify({
      positionPreset: input.positionPreset,
      frame: input.frame,
      shapes: summarizeShapes(input.shapes),
      assets: input.assets.map(({ id, name, alt, kind, mediaType, bgRemoved }) => ({
        id,
        name,
        alt,
        kind,
        mediaType,
        bgRemoved,
      })),
      features: input.features,
      deterministicMeasurements: measureLayout(input),
    })}`;
    const imageSpecialistInput = [
      {
        role: "user" as const,
        content: [
          { type: "input_text" as const, text: specialistPrompt },
          ...(input.imageDataUrl
            ? [{ type: "input_image" as const, image: input.imageDataUrl, detail: "low" as const }]
            : []),
        ],
      },
    ];
    const [imageReview, geometryReview, designReview] = await Promise.all([
      run(imageUnderstandingAgent, imageSpecialistInput),
      run(layoutGeometryAgent, specialistPrompt),
      run(designComplianceAgent, specialistPrompt),
    ]);

    const payload = {
      positionPreset: input.positionPreset,
      frame: input.frame,
      shapes: summarizeShapes(input.shapes),
      assets: input.assets.map(({ id, name, alt, kind, mediaType, bgRemoved }) => ({
        id,
        name,
        alt,
        kind,
        mediaType,
        bgRemoved,
      })),
      features: input.features,
      deterministicMeasurements: measureLayout(input),
      deterministicPatches: deterministic.patches,
      screenshotAttached: Boolean(input.imageDataUrl),
      specialistReviews: {
        imageUnderstanding: String(imageReview.finalOutput ?? ""),
        layoutGeometry: String(geometryReview.finalOutput ?? ""),
        designCompliance: String(designReview.finalOutput ?? ""),
      },
    };

    const result = await run(
      orchestrator,
      [
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: `Review this AdFrame layout and return strict JSON only:\n${JSON.stringify(payload)}`,
            },
            ...(input.imageDataUrl
              ? [
                  {
                    type: "input_image" as const,
                    image: input.imageDataUrl,
                    detail: "low" as const,
                  },
                ]
              : []),
          ],
        },
      ],
    );

    const parsed = parseAgentOutput(String(result.finalOutput ?? ""), deterministic);
    return LayoutReviewResultSchema.parse({
      ...parsed,
      source: "agents",
      findings: mergeFindings(deterministic.findings, parsed.findings),
      patches: sanitizePatches(input, [...deterministic.patches, ...parsed.patches]),
    });
  } catch {
    return deterministic;
  }
}

function deterministicReview(input: LayoutReviewRequest): LayoutReviewResult {
  const measurement = measureLayout(input);
  const findings = [...measurement.findings];
  const patches: LayoutPatch[] = [];

  for (const overflow of measurement.overflow) {
    const shape = input.shapes.find((item) => item.id === overflow.shapeId);
    if (!shape) continue;
    const w = asNumber(shape.props.w, 160);
    const h = asNumber(shape.props.h, 120);
    patches.push({
      type: "moveResize",
      shapeId: shape.id,
      x: clamp(shape.x, 0, Math.max(input.frame.width - w, 0)),
      y: clamp(shape.y, 0, Math.max(input.frame.height - h, 0)),
      w,
      h,
    });
  }

  if (input.positionPreset === "apple-infographic" && measurement.heroCenterDistance > 8) {
    const hero = input.shapes.find((shape) => shape.id.includes("apple-hero"));
    if (hero) {
      const w = asNumber(hero.props.w, input.frame.width * 0.52);
      patches.push({
        type: "moveResize",
        shapeId: hero.id,
        x: (input.frame.width - w) / 2,
        y: hero.y,
        w,
        h: asNumber(hero.props.h, 320),
      });
    }
  }

  const score = Math.max(0, 100 - findings.filter((finding) => finding.severity === "error").length * 20 - findings.length * 6);
  return {
    score,
    summary: findings.length
      ? `Deterministic review found ${findings.length} layout issue(s).`
      : "Deterministic review found no major layout issues.",
    findings,
    patches: sanitizePatches(input, patches),
    source: "deterministic",
  };
}

function measureLayout(input: LayoutReviewRequest) {
  const bounds = getBounds(input.shapes);
  const findings: LayoutReviewResult["findings"] = [];
  const overflow: Array<{ shapeId: string; sides: string[] }> = [];
  const overlaps: Array<{ a: string; b: string; area: number }> = [];
  const safeMarginViolations: string[] = [];
  const safeMargin = 24;

  for (const box of bounds) {
    const sides = [
      box.x < 0 ? "left" : "",
      box.y < 0 ? "top" : "",
      box.x + box.w > input.frame.width ? "right" : "",
      box.y + box.h > input.frame.height ? "bottom" : "",
    ].filter(Boolean);
    if (sides.length) {
      overflow.push({ shapeId: box.id, sides });
      findings.push({
        severity: "error",
        category: "overflow",
        shapeIds: [box.id],
        message: `${box.id} overflows the frame on: ${sides.join(", ")}.`,
      });
    }

    if (box.x < safeMargin || box.y < safeMargin || box.x + box.w > input.frame.width - safeMargin || box.y + box.h > input.frame.height - safeMargin) {
      safeMarginViolations.push(box.id);
    }
  }

  for (let i = 0; i < bounds.length; i += 1) {
    for (let j = i + 1; j < bounds.length; j += 1) {
      const a = bounds[i];
      const b = bounds[j];
      if (!a || !b) continue;
      if (isBenignOverlap(a, b)) continue;
      const area = overlapArea(a, b);
      const minArea = Math.min(a.w * a.h, b.w * b.h);
      if (area > 0 && area / Math.max(minArea, 1) > 0.18) {
        overlaps.push({ a: a.id, b: b.id, area });
        findings.push({
          severity: "warning",
          category: "overlap",
          shapeIds: [a.id, b.id],
          message: `${a.id} and ${b.id} overlap substantially.`,
        });
      }
    }
  }

  const hero = bounds.find((box) => box.id.includes("apple-hero") || box.id.includes("hero-cutout"));
  const heroCenterDistance = hero ? Math.abs(boxCenterX(hero) - input.frame.width / 2) : 0;
  let appleBoardMetrics: AppleBoardMetrics | undefined;

  if (input.positionPreset === "apple-infographic") {
    appleBoardMetrics = computeAppleBoardMetrics(bounds, input.frame.width, input.frame.height);
    if (heroCenterDistance > 8) {
      findings.push({
        severity: "warning",
        category: "design",
        shapeIds: hero ? [hero.id] : [],
        message: `Apple infographic hero is ${Math.round(heroCenterDistance)}px away from horizontal center.`,
      });
    }
    if (appleBoardMetrics.tileCount < 9) {
      findings.push({
        severity: "warning",
        category: "coverage",
        shapeIds: [],
        message: `Apple infographic should use at least 9 non-hero tiles around the main image; found ${appleBoardMetrics.tileCount}.`,
      });
    }
    if (appleBoardMetrics.nonHeroCoverageRatio < 0.52) {
      findings.push({
        severity: "warning",
        category: "coverage",
        shapeIds: [],
        message: `Apple infographic non-hero tile coverage is sparse (${Math.round(appleBoardMetrics.nonHeroCoverageRatio * 100)}%).`,
      });
    }
    if (appleBoardMetrics.gridOccupancyRatio < 0.58) {
      findings.push({
        severity: "warning",
        category: "coverage",
        shapeIds: [],
        message: `Apple infographic grid occupancy is weak (${Math.round(appleBoardMetrics.gridOccupancyRatio * 100)}%).`,
      });
    }
    if (appleBoardMetrics.missingZones.length > 0) {
      findings.push({
        severity: "warning",
        category: "coverage",
        shapeIds: [],
        message: `Apple infographic has empty layout zones: ${appleBoardMetrics.missingZones.join(", ")}.`,
      });
    }
    if (appleBoardMetrics.heroAdjacencyCount < 4) {
      findings.push({
        severity: "warning",
        category: "design",
        shapeIds: [],
        message: `Apple infographic hero needs tiles wrapping at least four sides/edges; found ${appleBoardMetrics.heroAdjacencyCount} adjacent tile(s).`,
      });
    }
  }

  return {
    overflow,
    overlaps,
    safeMarginViolations,
    heroCenterDistance,
    appleBoardMetrics,
    tileCoverageRatio: computeTileCoverage(bounds, input.frame.width * input.frame.height),
    findings,
  };
}

function rankAssetsForSlot(
  assets: LayoutReviewRequest["assets"],
  slot: "hero" | "feature" | "detail",
  featureTitle?: string,
  currentAssetId?: string,
) {
  return assets
    .filter((asset) => asset.mediaType !== "video")
    .map((asset) => ({
      ...asset,
      score: scoreAsset(asset, slot, featureTitle, currentAssetId),
    }))
    .sort((a, b) => b.score - a.score);
}

function scoreAsset(
  asset: LayoutReviewRequest["assets"][number],
  slot: "hero" | "feature" | "detail",
  featureTitle?: string,
  currentAssetId?: string,
) {
  if (asset.id === currentAssetId) return -Infinity;
  const text = `${asset.id} ${asset.name} ${asset.alt} ${asset.kind}`.toLowerCase();
  let score = 0;
  if (slot === "hero") {
    if (asset.kind === "hero") score += 70;
    if (asset.bgRemoved) score += 25;
    if (text.includes("front")) score += 14;
    if (text.includes("perspective")) score += 10;
    if (asset.kind === "section") score -= 35;
  }
  if (slot === "feature") {
    if (asset.kind === "section") score += 50;
    if (featureTitle) {
      for (const word of featureTitle.toLowerCase().split(/\s+/).filter((item) => item.length > 2)) {
        if (text.includes(word)) score += 12;
      }
    }
  }
  if (slot === "detail") {
    if (asset.kind === "gallery") score += 38;
    if (asset.kind === "section") score += 26;
    if (text.includes("side") || text.includes("port") || text.includes("detail")) score += 18;
  }
  return score;
}

function parseAgentOutput(output: string, fallback: LayoutReviewResult): Omit<LayoutReviewResult, "source"> {
  const json = extractJson(output);
  if (!json) return fallback;
  const parsed = LayoutReviewResultSchema.omit({ source: true }).safeParse(JSON.parse(json));
  return parsed.success ? parsed.data : fallback;
}

function extractJson(value: string) {
  const trimmed = value.trim();
  if (trimmed.startsWith("{") && trimmed.endsWith("}")) return trimmed;
  const match = trimmed.match(/\{[\s\S]*\}/);
  return match?.[0] || "";
}

function sanitizePatches(input: LayoutReviewRequest, patches: LayoutPatch[]) {
  const frameShapeIds = new Set(input.shapes.filter((shape) => shape.parentId === input.frame.id || shape.id === input.frame.id).map((shape) => shape.id));
  const assetMap = new Map(input.assets.map((asset) => [asset.id, asset]));
  const unique = new Map<string, LayoutPatch>();

  for (const patch of patches) {
    if (patch.type === "bringToFront") {
      const shapeIds = patch.shapeIds.filter((id) => frameShapeIds.has(id));
      if (shapeIds.length) unique.set(`front:${shapeIds.join(",")}`, { ...patch, shapeIds });
      continue;
    }
    if (!frameShapeIds.has(patch.shapeId)) continue;
    if (patch.type === "swapAsset") {
      const asset = assetMap.get(patch.assetId);
      if (!asset || asset.mediaType === "video") continue;
    }
    unique.set(`${patch.type}:${patch.shapeId}`, patch);
  }

  return Array.from(unique.values()).slice(0, 8);
}

function mergeFindings(a: LayoutReviewResult["findings"], b: LayoutReviewResult["findings"]) {
  const seen = new Set<string>();
  return [...a, ...b].filter((finding) => {
    const key = `${finding.category}:${finding.shapeIds.join(",")}:${finding.message}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function summarizeShapes(shapes: LayoutReviewRequest["shapes"]) {
  return shapes.map((shape) => ({
    id: shape.id,
    type: shape.type,
    parentId: shape.parentId,
    x: shape.x,
    y: shape.y,
    w: shape.props.w,
    h: shape.props.h,
    text: shape.props.text,
    title: shape.props.title,
    body: shape.props.body,
    src: shape.props.src,
    tone: shape.props.tone,
  }));
}

function getBounds(shapes: LayoutReviewRequest["shapes"]): Bounds[] {
  return shapes
    .filter((shape) => shape.type !== "frame" && !shape.type.includes("canvas-bg"))
    .map((shape) => ({
      id: shape.id,
      type: shape.type,
      x: shape.x,
      y: shape.y,
      w: asNumber(shape.props.w, 0),
      h: asNumber(shape.props.h, 0),
    }))
    .filter((box) => box.w > 0 && box.h > 0);
}

function asNumber(value: unknown, fallback: number) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function boxCenterX(box: Bounds) {
  return box.x + box.w / 2;
}

function overlapArea(a: Bounds, b: Bounds) {
  const xOverlap = Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x));
  const yOverlap = Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y));
  return xOverlap * yOverlap;
}

function isBenignOverlap(a: Bounds, b: Bounds) {
  const pair = `${a.id} ${b.id}`;
  return (
    pair.includes("hero") ||
    pair.includes("badge") ||
    pair.includes("icon") ||
    (a.type.includes("glass-text") && b.type.includes("cutout-image"))
  );
}

function computeTileCoverage(bounds: Bounds[], frameArea: number) {
  const covered = bounds.reduce((sum, box) => sum + box.w * box.h, 0);
  return Math.min(covered / Math.max(frameArea, 1), 1);
}

function computeAppleBoardMetrics(bounds: Bounds[], frameW: number, frameH: number): AppleBoardMetrics {
  const hero = bounds.find(isHeroBox);
  const tiles = bounds.filter((box) => !isHeroBox(box));
  const verticalZones = new Set<string>();
  const horizontalZones = new Set<string>();

  for (const box of tiles) {
    const cx = boxCenterX(box);
    const cy = box.y + box.h / 2;
    verticalZones.add(cy < frameH * 0.33 ? "top" : cy > frameH * 0.66 ? "bottom" : "middle");
    horizontalZones.add(cx < frameW * 0.33 ? "left" : cx > frameW * 0.66 ? "right" : "center");
  }

  const missingZones = ["top", "middle", "bottom"]
    .filter((zone) => !verticalZones.has(zone))
    .concat(["left", "center", "right"].filter((zone) => !horizontalZones.has(zone)));

  return {
    gridOccupancyRatio: computeGridOccupancy(bounds, frameW, frameH, 10, 12),
    heroAdjacencyCount: hero ? countHeroAdjacentTiles(hero, tiles) : 0,
    missingZones,
    nonHeroCoverageRatio: computeTileCoverage(tiles, frameW * frameH),
    tileCount: tiles.length,
  };
}

function computeGridOccupancy(bounds: Bounds[], frameW: number, frameH: number, cols: number, rows: number) {
  let occupied = 0;
  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      const x = ((col + 0.5) / cols) * frameW;
      const y = ((row + 0.5) / rows) * frameH;
      if (bounds.some((box) => x >= box.x && x <= box.x + box.w && y >= box.y && y <= box.y + box.h)) {
        occupied += 1;
      }
    }
  }
  return occupied / (cols * rows);
}

function countHeroAdjacentTiles(hero: Bounds, tiles: Bounds[]) {
  const tolerance = Math.max(36, Math.min(hero.w, hero.h) * 0.12);
  return tiles.filter((tile) => {
    const horizontalOverlap = Math.min(hero.x + hero.w, tile.x + tile.w) - Math.max(hero.x, tile.x);
    const verticalOverlap = Math.min(hero.y + hero.h, tile.y + tile.h) - Math.max(hero.y, tile.y);
    const nearLeft = Math.abs(tile.x + tile.w - hero.x) <= tolerance && verticalOverlap > 0;
    const nearRight = Math.abs(tile.x - (hero.x + hero.w)) <= tolerance && verticalOverlap > 0;
    const nearTop = Math.abs(tile.y + tile.h - hero.y) <= tolerance && horizontalOverlap > 0;
    const nearBottom = Math.abs(tile.y - (hero.y + hero.h)) <= tolerance && horizontalOverlap > 0;
    return nearLeft || nearRight || nearTop || nearBottom;
  }).length;
}

function isHeroBox(box: Bounds) {
  return box.id.includes("apple-hero") || box.id.includes("hero-cutout");
}
