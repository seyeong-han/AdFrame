import {
  BaseBoxShapeUtil,
  HTMLContainer,
  TLBaseShape,
  type TLShapePartial,
} from "tldraw";
import type { GlassTone, Provenance } from "@/lib/types";

export const GLASS_CARD_TYPE = "ff-glass-card";
export const GLASS_TEXT_TYPE = "ff-glass-text";
export const CUTOUT_IMAGE_TYPE = "ff-cutout-image";
export const BADGE_TYPE = "ff-badge";
export const ICON_TYPE = "ff-icon";

type BaseProps = {
  w: number;
  h: number;
  provenance: Provenance;
};

export type GlassCardShape = TLBaseShape<
  typeof GLASS_CARD_TYPE,
  BaseProps & {
    title: string;
    body: string;
    tone: GlassTone;
  }
>;

export type GlassTextShape = TLBaseShape<
  typeof GLASS_TEXT_TYPE,
  BaseProps & {
    text: string;
    size: number;
    align: "left" | "center" | "right";
  }
>;

export type CutoutImageShape = TLBaseShape<
  typeof CUTOUT_IMAGE_TYPE,
  BaseProps & {
    src: string;
    alt: string;
    fit: "contain" | "cover";
    bgRemoved: boolean;
  }
>;

export type BadgeShape = TLBaseShape<
  typeof BADGE_TYPE,
  BaseProps & {
    text: string;
    tone: GlassTone;
  }
>;

export type IconShape = TLBaseShape<
  typeof ICON_TYPE,
  BaseProps & {
    icon: "spark" | "processor" | "motion" | "hdr";
    tone: GlassTone;
  }
>;

declare module "@tldraw/tlschema" {
  interface TLGlobalShapePropsMap {
    [GLASS_CARD_TYPE]: GlassCardShape["props"];
    [GLASS_TEXT_TYPE]: GlassTextShape["props"];
    [CUTOUT_IMAGE_TYPE]: CutoutImageShape["props"];
    [BADGE_TYPE]: BadgeShape["props"];
    [ICON_TYPE]: IconShape["props"];
  }
}

function indicatorPath(w: number, h: number) {
  const path = new Path2D();
  path.roundRect(0, 0, w, h, 24);
  return path;
}

export class GlassCardShapeUtil extends BaseBoxShapeUtil<GlassCardShape> {
  static override type = GLASS_CARD_TYPE;

  override canResize() {
    return true;
  }

  override isAspectRatioLocked() {
    return false;
  }

  override getDefaultProps(): GlassCardShape["props"] {
    return {
      w: 180,
      h: 180,
      title: "OLED HDR+",
      body: "High contrast, rich color, and cinematic depth.",
      tone: "frost",
      provenance: "inferred",
    };
  }

  override component(shape: GlassCardShape) {
    return (
      <HTMLContainer id={shape.id} style={{ pointerEvents: "all" }}>
        <div className={`glass-card-shape ${shape.props.tone}`}>
          <div className="glass-card-title">{shape.props.title}</div>
          <div className="glass-card-body">{shape.props.body}</div>
        </div>
      </HTMLContainer>
    );
  }

  override getIndicatorPath(shape: GlassCardShape) {
    return indicatorPath(shape.props.w, shape.props.h);
  }
}

export class GlassTextShapeUtil extends BaseBoxShapeUtil<GlassTextShape> {
  static override type = GLASS_TEXT_TYPE;

  override canResize() {
    return true;
  }

  override getDefaultProps(): GlassTextShape["props"] {
    return {
      w: 360,
      h: 96,
      text: "OLED, staged for cinema.",
      size: 52,
      align: "left",
      provenance: "inferred",
    };
  }

  override component(shape: GlassTextShape) {
    return (
      <HTMLContainer id={shape.id} style={{ pointerEvents: "all" }}>
        <div
          className="adframe-display-text"
          style={{
            width: "100%",
            height: "100%",
            fontSize: shape.props.size,
            textAlign: shape.props.align,
          }}
        >
          {shape.props.text}
        </div>
      </HTMLContainer>
    );
  }

  override getIndicatorPath(shape: GlassTextShape) {
    return indicatorPath(shape.props.w, shape.props.h);
  }
}

export class CutoutImageShapeUtil extends BaseBoxShapeUtil<CutoutImageShape> {
  static override type = CUTOUT_IMAGE_TYPE;

  override canResize() {
    return true;
  }

  override getDefaultProps(): CutoutImageShape["props"] {
    return {
      w: 360,
      h: 240,
      src: "/fixtures/samsung-s90f/oled-tv.svg",
      alt: "Product cutout",
      fit: "contain",
      bgRemoved: true,
      provenance: "verified",
    };
  }

  override component(shape: CutoutImageShape) {
    const isCover = shape.props.fit === "cover";
    return (
      <HTMLContainer id={shape.id} style={{ pointerEvents: "all", overflow: isCover ? "hidden" : "visible" }}>
        <div
          className="cutout-shape"
          style={{
            borderRadius: isCover ? 24 : undefined,
            overflow: isCover ? "hidden" : "visible",
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            draggable={false}
            onDragStart={(event) => event.preventDefault()}
            src={shape.props.src}
            alt={shape.props.alt}
            style={{
              height: isCover ? "100%" : undefined,
              objectFit: shape.props.fit,
              width: isCover ? "100%" : undefined,
            }}
          />
        </div>
      </HTMLContainer>
    );
  }

  override getIndicatorPath(shape: CutoutImageShape) {
    return indicatorPath(shape.props.w, shape.props.h);
  }
}

export class BadgeShapeUtil extends BaseBoxShapeUtil<BadgeShape> {
  static override type = BADGE_TYPE;

  override canResize() {
    return true;
  }

  override getDefaultProps(): BadgeShape["props"] {
    return {
      w: 170,
      h: 42,
      text: "Verified PDP fact",
      tone: "clear",
      provenance: "verified",
    };
  }

  override component(shape: BadgeShape) {
    return (
      <HTMLContainer id={shape.id} style={{ pointerEvents: "all" }}>
        <div
          className={`glass-card-shape ${shape.props.tone}`}
          style={{
            alignContent: "center",
            borderRadius: 9999,
            fontSize: 13,
            fontWeight: 600,
            height: "100%",
            justifyItems: "center",
            padding: "0 16px",
            textTransform: "uppercase",
          }}
        >
          {shape.props.text}
        </div>
      </HTMLContainer>
    );
  }

  override getIndicatorPath(shape: BadgeShape) {
    return indicatorPath(shape.props.w, shape.props.h);
  }
}

export class IconShapeUtil extends BaseBoxShapeUtil<IconShape> {
  static override type = ICON_TYPE;

  override canResize() {
    return true;
  }

  override getDefaultProps(): IconShape["props"] {
    return {
      w: 64,
      h: 64,
      icon: "spark",
      tone: "frost",
      provenance: "generated",
    };
  }

  override component(shape: IconShape) {
    return (
      <HTMLContainer id={shape.id} style={{ pointerEvents: "all" }}>
        <div
          className={`glass-card-shape ${shape.props.tone}`}
          style={{ alignContent: "center", borderRadius: 9999, justifyItems: "center", padding: 0 }}
        >
          <span className="adframe-icon-glyph">{iconGlyph(shape.props.icon)}</span>
        </div>
      </HTMLContainer>
    );
  }

  override getIndicatorPath(shape: IconShape) {
    return indicatorPath(shape.props.w, shape.props.h);
  }
}

export const fridgeFrameShapeUtils = [
  GlassCardShapeUtil,
  GlassTextShapeUtil,
  CutoutImageShapeUtil,
  BadgeShapeUtil,
  IconShapeUtil,
];

export type AdFrameShape =
  | GlassCardShape
  | GlassTextShape
  | CutoutImageShape
  | BadgeShape
  | IconShape;

export type AdFrameShapePartial = TLShapePartial<AdFrameShape>;

function iconGlyph(icon: IconShape["props"]["icon"]) {
  switch (icon) {
    case "processor":
      return "NQ";
    case "motion":
      return "144";
    case "hdr":
      return "HDR";
    default:
      return "*";
  }
}
