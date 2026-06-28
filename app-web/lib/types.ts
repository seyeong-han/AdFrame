export const SAMSUNG_DEMO_URL =
  "https://www.samsung.com/us/tvs/oled-tv/77-class-oled-tvs90f-sku-qn77s90fafxza/";

export type Provenance = "verified" | "inferred" | "generated";

export type Fact = {
  id: string;
  label: string;
  value: string;
  provenance: Provenance;
  source?: string;
};

export type ProductFeature = {
  id: string;
  title: string;
  body: string;
  provenance: Provenance;
  sourceFactIds: string[];
};

export type ProductAsset = {
  id: string;
  name: string;
  src: string;
  alt: string;
  provenance: Provenance;
  kind: "hero" | "gallery" | "section" | "video" | "generated" | "upload";
  mediaType?: "image" | "video";
  bgRemoved?: boolean;
};

export type ProductDesignSystem = {
  name: string;
  sourceUrl: string;
  generatedAt: string;
  confidence: "high" | "medium" | "low";
  designMdPath: string;
  tokensSourcePath: string;
  tokens: {
    paper: string;
    paper2: string;
    ink: string;
    ink2: string;
    rule: string;
    accent: string;
    accentInk: string;
    focus: string;
    fontDisplay: string;
    fontBody: string;
    fontMono: string;
    radiusCard: string;
    radiusPill: string;
    radiusInput: string;
  };
  evidence: {
    fonts: string[];
    colors: string[];
    radii: string[];
    source: "live-cssom" | "fixture";
  };
};

export type ProductExtraction = {
  url: string;
  name: string;
  model: string;
  price: string;
  previousPrice?: string;
  headline: string;
  subtitle: string;
  facts: Fact[];
  features: ProductFeature[];
  assets: ProductAsset[];
  designSystem?: ProductDesignSystem;
  extractedAt: string;
  extractionMode: "live" | "fixture";
  notes: string[];
};

export type ExportPreset = {
  id: "feed" | "story" | "square";
  label: string;
  width: number;
  height: number;
  ratio: string;
};

export const EXPORT_PRESETS: ExportPreset[] = [
  { id: "feed", label: "IG Feed 4:5", width: 1080, height: 1350, ratio: "4 / 5" },
  { id: "story", label: "Story 9:16", width: 1080, height: 1920, ratio: "9 / 16" },
  { id: "square", label: "Square 1:1", width: 1080, height: 1080, ratio: "1 / 1" },
];

export type GlassTone = "frost" | "ink" | "clear";
