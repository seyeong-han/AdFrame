import type { GlassTone } from "@/lib/types";

export type PositionPresetId = "cinema-mosaic" | "apple-infographic";

export type PositionPreset = {
  id: PositionPresetId;
  label: string;
  description: string;
};

export type StylePreset = {
  id: "apple-clean" | "luxury-premium" | "pastel-editorial" | "bold-social" | "trust-clinical";
  label: string;
  description: string;
  cardTone: GlassTone;
  headlineScale: number;
  shadowDepth: "soft" | "medium" | "deep";
};

export const POSITION_PRESETS: PositionPreset[] = [
  {
    id: "cinema-mosaic",
    label: "Cinema mosaic",
    description: "Current dark AdFrame story layout with editorial copy, product cutout, and lower feature mosaic.",
  },
  {
    id: "apple-infographic",
    label: "Apple infographic",
    description: "Light rounded tile board with a centered hero image, surrounding feature/spec tiles, and sparse orange accent.",
  },
];

export const STYLE_PRESETS: StylePreset[] = [
  {
    id: "apple-clean",
    label: "Apple-clean",
    description: "Dark Apple-style glass tiles on black canvas, one message per tile.",
    cardTone: "tile",
    headlineScale: 1,
    shadowDepth: "soft",
  },
  {
    id: "luxury-premium",
    label: "Luxury premium",
    description: "Deepest near-black ink tiles, stronger depth, editorial contrast.",
    cardTone: "ink",
    headlineScale: 1.08,
    shadowDepth: "deep",
  },
  {
    id: "pastel-editorial",
    label: "Frosted editorial",
    description: "Lighter frosted-glass tiles over the dark canvas for an airy balance.",
    cardTone: "frost",
    headlineScale: 0.96,
    shadowDepth: "soft",
  },
  {
    id: "bold-social",
    label: "Bold social ad",
    description: "Larger copy, tighter cards, optimized for fast scrolling.",
    cardTone: "accent",
    headlineScale: 1.18,
    shadowDepth: "medium",
  },
  {
    id: "trust-clinical",
    label: "Trust / clinical",
    description: "Structured claims, subdued cards, verified-fact emphasis.",
    cardTone: "tile",
    headlineScale: 0.9,
    shadowDepth: "soft",
  },
];
