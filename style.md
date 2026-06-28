# AdFrame Style Guide (implementation notes)

The canonical design system is [`DESIGN.md`](./DESIGN.md) — Apple-Inspired Tile-Based Infographic System (dark canvas). This file maps that system onto the AdFrame editor implementation. When the two disagree, `DESIGN.md` wins.

## Posture

- **Dark, premium canvas.** Export canvas is pure black `#000000`; large dark-glass tiles (`#111111` + subtle white gradient); high-contrast **white** typography. No light/beige/peach backgrounds in the final infographic.
- **Product first.** One dominant hero cutout with a single accent glow; section visuals become cover-cropped image tiles paired with editable feature copy.
- **Restraint.** Accent color appears at most 2–3 times per canvas. Every tile must show an extracted asset, a verified spec, or an editable claim — never an empty tile.

## Tone → tldraw mapping

| Tone (`GlassTone`) | Surface | Use |
| --- | --- | --- |
| `tile` | dark glass (`#111` + glass gradient), white text | default feature/spec/badge tiles |
| `ink` | solid near-black `#0a0a0a` | quiet footer / dense areas |
| `frost` | lighter glass (more white) | elevated callouts |
| `clear` | subtle low-alpha glass | overlays on imagery |
| `accent` | dark surface + accent glow + accent border | the ONE primary callout (≤2–3 per canvas) |

## Layout

- 12-column grid on the 1080-wide export frame; outer margin `72px`, gutter `20–24px`.
- Radii: tiles `40px` (`--tile-radius`), hero `56px`, pills `999px`.
- Hero zone: dominant product cutout (~55–60% width) with one radial accent glow behind it.
- Header zone: top-left headline + verified/price pill.
- Feature mosaic: lower third, 3 tiles, each = cover-cropped section visual above an editable dark-glass feature card.

## Type

- Headline (`.adframe-display-text`): white, bold, ~72–92px on 1080 width, tight tracking.
- Card title (`.glass-card-title`): white, ~28–34px, bold, non-italic.
- Card body (`.glass-card-body`): muted `#a3a3a3`, ~14–24px, 2–4 short lines.
- Pills/eyebrows: uppercase, 12–14px, semibold, muted.

## Asset priority

1. `kind: "hero"` (or best gallery cutout) → dominant product, `fit: contain` + drop-shadow.
2. `kind: "section"` visual crops → feature image tiles, `fit: cover`.
3. `kind: "gallery"` → secondary detail.
4. `mediaType: "video"` → source preview only; never placed as a static image shape.

## Template contract (default editor doc)

The default template must:

- Insert the dark canvas-background shape (`ff-canvas-bg`) as the first child of the export frame.
- Use at least one hero/product asset.
- Use at least three section visual crops when available.
- Pair section visuals with editable feature cards (no empty cards).
- Use `tone: "accent"` at most 2–3 times.
- Keep all non-frame shapes parented to the export frame.
- Exclude MP4/video assets from static image placement.
- Exclude editor-only chrome (provenance/cutout badges) from export artwork.
