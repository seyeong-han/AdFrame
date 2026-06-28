# AdFrame Style Guide

Reusable visual rules for Apple-style product infographic layouts.

## Reference Breakdown

The target style is not a generic collage. It is a disciplined product infographic grid:

- **Canvas**: light warm-gray or white background, no heavy chrome, generous outer margin.
- **Composition**: asymmetric grid of rounded tiles around one dominant product hero.
- **Cards**: rounded rectangles with soft gray fill, large radius, almost no visible border, soft ambient shadow.
- **Images**: cropped tightly and used as tile fills, not floating thumbnails. Visuals should occupy meaningful card area.
- **Typography**: dark text on light cards; short labels; large numeric/spec moments when possible.
- **Accent**: one strong brand/accent color, used sparingly for spec numbers, badges, or emphasis.
- **Spacing**: consistent gutters; cards align to a shared grid; avoid accidental blank tiles.
- **Content**: every tile must either show an extracted asset, a verified spec, or an editable feature claim.

## Layout Rules

Use a 12-column grid on the export frame.

- Outer margin: `72px` on a 1080px-wide frame.
- Gutter: `24px`.
- Corner radius: `28px` for image cards, `30px` for text cards, `999px` for pills.
- Hero zone: center/right dominant product cutout, approximately `55-60%` of frame width.
- Header zone: top-left headline and source/price pill.
- Feature mosaic: bottom third with 3-4 tile groups.
- Supporting media: section visuals become cover-cropped image tiles above or beside their matching feature copy.

## Card Rules

Cards must never be visually empty.

- Text cards use `tone: "tile"`: light gray fill, dark text.
- Primary spec cards use `tone: "accent"`: brand/accent fill, dark or white text depending on contrast.
- Dark cards use `tone: "ink"` only when placed on image-heavy or dark areas.
- Do not place white text on white or pale cards.
- Do not show implementation/provenance badges such as `cutout` inside the export artwork.

## Type Rules

- Headline: large, dark, bold sans; roughly `72-92px` on 1080px width.
- Subtitle/body: `24-32px`, dark gray, short lines.
- Card title: `26-34px`, bold, normal style, no decorative italic.
- Card body: `13-16px`, medium gray, 2-4 lines max.
- Pills: uppercase or compact spec line, `12-14px`, semibold.

## Asset Rules

Prioritize extracted assets in this order:

1. `kind: "hero"` or best product gallery cutout for the dominant product.
2. `kind: "section"` visual crops for feature tiles.
3. `kind: "gallery"` for secondary details.
4. `mediaType: "video"` as source preview only until a dedicated video shape exists.

Videos should not be placed into the static canvas as image shapes. Use video thumbnails or a future `VideoShapeUtil` if canvas motion support is needed.

## AdFrame Template Contract

The default editor template must:

- Use at least one hero/product asset.
- Use at least three section visual crops when available.
- Pair section visuals with editable feature cards.
- Keep all non-frame shapes parented to the export frame.
- Exclude MP4/video assets from static image placement.
- Use light-card tones for feature cards on white canvas.
