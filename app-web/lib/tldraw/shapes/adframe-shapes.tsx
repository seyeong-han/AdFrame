import { useCallback, useEffect, useRef } from "react";
import type { CSSProperties } from "react";
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
export const CANVAS_BG_TYPE = "ff-canvas-bg";

type BaseProps = {
  w: number;
  h: number;
  provenance: Provenance;
};

export type CanvasBackgroundShape = TLBaseShape<
  typeof CANVAS_BG_TYPE,
  BaseProps & {
    accent: string;
    variant?: "dark" | "light";
  }
>;

export type GlassCardShape = TLBaseShape<
  typeof GLASS_CARD_TYPE,
  BaseProps & {
    title: string;
    body: string;
    tone: GlassTone;
    showBody?: boolean;
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
    caption?: string;
    semanticGroup?: string;
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
    [CANVAS_BG_TYPE]: CanvasBackgroundShape["props"];
  }
}

function indicatorPath(w: number, h: number) {
  const path = new Path2D();
  path.roundRect(0, 0, w, h, 24);
  return path;
}

export class CanvasBackgroundShapeUtil extends BaseBoxShapeUtil<CanvasBackgroundShape> {
  static override type = CANVAS_BG_TYPE;

  override canResize() {
    return true;
  }

  override isAspectRatioLocked() {
    return false;
  }

  override hideRotateHandle() {
    return true;
  }

  override getDefaultProps(): CanvasBackgroundShape["props"] {
    return {
      w: 1080,
      h: 1920,
      accent: "#1677ff",
      variant: "dark",
      provenance: "generated",
    };
  }

  override component(shape: CanvasBackgroundShape) {
    return (
      <HTMLContainer id={shape.id} style={{ pointerEvents: "all" }}>
        <div
          className={`infograph-canvas-bg ${shape.props.variant || "dark"}`}
          style={{ "--brand-accent": shape.props.accent } as CSSProperties}
        />
      </HTMLContainer>
    );
  }

  override getIndicatorPath(shape: CanvasBackgroundShape) {
    return indicatorPath(shape.props.w, shape.props.h);
  }
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
      showBody: false,
      provenance: "inferred",
    };
  }

  override component(shape: GlassCardShape) {
    return (
      <HTMLContainer id={shape.id} style={{ pointerEvents: "all" }}>
        <div className={`glass-card-shape ${shape.props.tone}`}>
          <div className="glass-card-title">{shape.props.title}</div>
          {shape.props.showBody ? <div className="glass-card-body">{shape.props.body}</div> : null}
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

function fitImageToBox(naturalWidth: number, naturalHeight: number, boxWidth: number, boxHeight: number) {
  const scale = Math.min(boxWidth / naturalWidth, boxHeight / naturalHeight);
  return {
    height: naturalHeight * scale,
    width: naturalWidth * scale,
  };
}

function fitImageFullWidth(
  naturalWidth: number,
  naturalHeight: number,
  boxWidth: number,
  boxHeight: number,
) {
  const height = naturalHeight * (boxWidth / naturalWidth);
  return {
    height: Math.min(height, boxHeight),
    width: boxWidth,
  };
}

function FitCutoutImage({
  alt,
  bgRemoved,
  boxHeight,
  boxWidth,
  src,
}: {
  alt: string;
  bgRemoved: boolean;
  boxHeight: number;
  boxWidth: number;
  src: string;
}) {
  const imgRef = useRef<HTMLImageElement>(null);

  const applyFit = useCallback(() => {
    const img = imgRef.current;
    if (!img?.naturalWidth || !img.naturalHeight) return;
    const fitted = bgRemoved
      ? fitImageToBox(img.naturalWidth, img.naturalHeight, boxWidth, boxHeight)
      : fitImageFullWidth(img.naturalWidth, img.naturalHeight, boxWidth, boxHeight);
    img.style.width = `${fitted.width}px`;
    img.style.height = `${fitted.height}px`;
  }, [bgRemoved, boxHeight, boxWidth]);

  useEffect(() => {
    applyFit();
  }, [applyFit, src]);

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      ref={imgRef}
      draggable={false}
      onDragStart={(event) => event.preventDefault()}
      onLoad={applyFit}
      src={src}
      alt={alt}
    />
  );
}

export class CutoutImageShapeUtil extends BaseBoxShapeUtil<CutoutImageShape> {
  static override type = CUTOUT_IMAGE_TYPE;

  override canResize() {
    return true;
  }

  override isAspectRatioLocked() {
    return false;
  }

  override getDefaultProps(): CutoutImageShape["props"] {
    return {
      w: 360,
      h: 240,
      src: "/fixtures/samsung-s90f/oled-tv.svg",
      alt: "Product cutout",
      fit: "contain",
      bgRemoved: true,
      caption: "front TV product cutout",
      semanticGroup: "product-front",
      provenance: "verified",
    };
  }

  override component(shape: CutoutImageShape) {
    const isCover = shape.props.fit === "cover";
    const boxStyle = {
      height: shape.props.h,
      width: shape.props.w,
    } satisfies CSSProperties;

    return (
      <HTMLContainer
        id={shape.id}
        style={{ pointerEvents: "all", overflow: "hidden", ...boxStyle }}
      >
        <div
          className="cutout-shape"
          style={{
            ...boxStyle,
            borderRadius: isCover ? 24 : undefined,
            overflow: isCover ? "hidden" : undefined,
          }}
        >
          <FitCutoutImage
            alt={shape.props.alt}
            bgRemoved={shape.props.bgRemoved}
            boxHeight={shape.props.h}
            boxWidth={shape.props.w}
            src={shape.props.src}
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

export const adFrameShapeUtils = [
  CanvasBackgroundShapeUtil,
  GlassCardShapeUtil,
  GlassTextShapeUtil,
  CutoutImageShapeUtil,
  BadgeShapeUtil,
  IconShapeUtil,
];

export type AdFrameShape =
  | CanvasBackgroundShape
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
